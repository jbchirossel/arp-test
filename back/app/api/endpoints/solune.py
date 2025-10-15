from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
import pandas as pd
import io
import os
from typing import List, Dict, Any, Optional
import logging

from ... import auth, schemas
from ...database import get_db
from sqlalchemy.orm import Session

router = APIRouter()
logger = logging.getLogger(__name__)

# Configuration des colonnes et constantes
REQUIRED_COLUMNS = [
    'Réf ARP', 'Désignation', 'Date besoin', 'Version', 
    'Ebauche', 'Qté', 'Prix', 'Bande'
]

COLUMN_MAPPING = {
    'Réf ARP': 'Référence',
    'Désignation': 'Désignation',
}

FINAL_COLUMN_ORDER = [
    'Commande', 'Référence', 'Désignation', 'Date besoin',
    'Ebauche', 'Version', 'Qté', 'Annulé', 'Prix', 'Bande'
]

SUPPORTED_ENCODINGS = ['latin-1', 'cp1252', 'utf-8', 'utf-8-sig']


async def _read_file_content(uploaded_file: UploadFile) -> pd.DataFrame:
    """Lit le contenu d'un fichier et retourne un DataFrame pandas."""
    try:
        if uploaded_file.filename.lower().endswith('.xlsx'):
            content = await uploaded_file.read()
            return pd.read_excel(io.BytesIO(content), dtype=str)
        else:
            return await _read_csv_with_encoding(uploaded_file)
    except Exception as e:
        logger.error(f"Erreur lecture fichier {uploaded_file.filename}: {str(e)}")
        raise HTTPException(
            status_code=400, 
            detail=f"Erreur lors de la lecture du fichier {uploaded_file.filename}: {str(e)}"
        )


async def _read_csv_with_encoding(uploaded_file: UploadFile) -> pd.DataFrame:
    """Lit un fichier CSV en essayant différents encodages."""
    content = await uploaded_file.read()
    
    for encoding in SUPPORTED_ENCODINGS:
        try:
            df = pd.read_csv(io.BytesIO(content), sep=';', dtype=str, encoding=encoding)
            # Vérifier la qualité de l'encodage
            if _is_valid_encoding(df):
                return df
        except Exception:
            continue
    
    raise HTTPException(
        status_code=400,
        detail=f"Impossible de lire le fichier {uploaded_file.filename} avec les encodages supportés"
    )


def _is_valid_encoding(df: pd.DataFrame) -> bool:
    """Vérifie si l'encodage semble correct."""
    sample_values = df.values.flatten()
    str_values = [str(val) for val in sample_values if isinstance(val, str)]
    
    # Vérifier les caractères spéciaux corrects
    has_special_chars = any('é' in val or 'à' in val or '@' in val for val in str_values)
    # Vérifier l'absence de caractères corrompus
    has_corrupted_chars = any('Ã©' in val or 'Ã ' in val for val in str_values)
    
    return has_special_chars or not has_corrupted_chars


def _validate_columns(df: pd.DataFrame, filename: str) -> None:
    """Valide que toutes les colonnes requises sont présentes."""
    missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Colonnes manquantes dans {filename}: {missing_columns}"
        )


def _process_dataframe(df: pd.DataFrame, command_name: str) -> pd.DataFrame:
    """Traite le DataFrame selon la logique métier."""
    # Sélectionner les colonnes requises
    df = df[REQUIRED_COLUMNS].copy()
    
    # Ajouter colonne Annulé
    df['Annulé'] = ''
    
    # Renommer les colonnes
    df = df.rename(columns=COLUMN_MAPPING)
    
    # Convertir Date besoin en datetime
    df['Date besoin'] = pd.to_datetime(df['Date besoin'], errors='coerce')
    
    # Grouper par Référence et Ebauche
    result = df.groupby(['Référence', 'Ebauche'], as_index=False).agg({
        'Référence': 'first',
        'Désignation': 'first',
        'Date besoin': 'min',
        'Ebauche': 'first',
        'Version': 'first',
        'Qté': lambda x: pd.to_numeric(x, errors='coerce').sum(),
        'Prix': 'first',
        'Bande': 'first',
        'Annulé': 'first'
    })
    
    # Reconvertir Date besoin en texte
    result['Date besoin'] = result['Date besoin'].dt.strftime('%d/%m/%Y')
    
    # Traiter la colonne Prix
    result['Prix'] = _format_price_column(result['Prix'])
    
    # Ajouter colonne Commande
    result.insert(0, 'Commande', command_name)
    
    # Réorganiser les colonnes
    result = result[FINAL_COLUMN_ORDER]
    
    # Nettoyer les colonnes texte
    return _clean_text_columns(result)


def _format_price_column(price_series: pd.Series) -> pd.Series:
    """Formate la colonne Prix."""
    # Nettoyer les prix
    prices = price_series.str.replace('€', '', regex=False)
    prices = prices.str.replace(',', '.', regex=False)
    prices = pd.to_numeric(prices, errors='coerce')
    
    # Formater selon les règles métier
    def format_price(x):
        if pd.isna(x):
            return ""
        if x == int(x):
            return str(int(x))
        return str(x).replace('.', ',')
    
    return prices.apply(format_price)


def _clean_text_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Nettoie les colonnes texte en préservant les caractères spéciaux."""
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].astype(str)
        # Nettoyer les caractères de contrôle
        df[col] = df[col].str.replace('\x00', '', regex=False)
        df[col] = df[col].str.replace('\r', '', regex=False)
        df[col] = df[col].str.strip()
        df[col] = df[col].fillna("")
        df[col] = df[col].replace(["None", "nan", "NaN"], "")
        # Normaliser les espaces multiples
        df[col] = df[col].str.replace(r'\s+', ' ', regex=True)
    
    return df


def _generate_csv_response(df: pd.DataFrame, filename: str) -> StreamingResponse:
    """Génère une réponse CSV streaming."""
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, sep=';', index=False, encoding='utf-8-sig')
    csv_content = csv_buffer.getvalue()
    
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
    )


@router.post("/upload-files")
async def upload_files(
    files: List[UploadFile] = File(...),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """
    Traite les fichiers CSV/Excel fournisseur et retourne les données traitées
    """
    results = []
    
    for uploaded_file in files:
        try:
            # Lire le fichier
            df = await _read_file_content(uploaded_file)
            
            # Valider les colonnes
            _validate_columns(df, uploaded_file.filename)
            
            # Traiter le DataFrame
            command_name = os.path.splitext(uploaded_file.filename)[0]
            processed_df = _process_dataframe(df, command_name)
            
            # Convertir en format JSON pour l'API
            result_dict = processed_df.to_dict('records')
            
            results.append({
                "filename": uploaded_file.filename,
                "commande": command_name,
                "data": result_dict,
                "row_count": len(result_dict)
            })
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erreur traitement fichier {uploaded_file.filename}: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Erreur lors du traitement du fichier {uploaded_file.filename}: {str(e)}"
            )
    
    return {
        "success": True,
        "message": f"{len(results)} fichier(s) traité(s) avec succès",
        "results": results
    }

@router.post("/download-csv")
async def download_csv(
    data: dict,
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """
    Génère et retourne un fichier CSV à télécharger
    """
    try:
        df = pd.DataFrame(data["data"])
        return _generate_csv_response(df, data['filename'])
    except Exception as e:
        logger.error(f"Erreur génération CSV: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Erreur lors de la génération du CSV: {str(e)}"
        )

@router.post("/download-csv-direct")
async def download_csv_direct(
    files: List[UploadFile] = File(...),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """
    Traite et télécharge directement le CSV sans passer par JSON (comme l'app desktop)
    """
    try:
        if len(files) != 1:
            raise HTTPException(status_code=400, detail="Un seul fichier à la fois pour le téléchargement direct")
        
        uploaded_file = files[0]
        
        # Lire et traiter le fichier
        df = await _read_file_content(uploaded_file)
        _validate_columns(df, uploaded_file.filename)
        
        command_name = os.path.splitext(uploaded_file.filename)[0]
        processed_df = _process_dataframe(df, command_name)
        
        return _generate_csv_response(processed_df, command_name)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur traitement direct: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Erreur lors du traitement direct: {str(e)}"
        )

