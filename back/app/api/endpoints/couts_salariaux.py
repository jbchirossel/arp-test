import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
from io import BytesIO

from app.database import get_db
from app.auth import get_current_user
from app import crud, schemas, models

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/upload", response_model=schemas.CoutsSalariauxUploadResponse)
async def upload_couts_salariaux(
    file: UploadFile = File(...),
    append_to_file_id: Optional[int] = Form(None, description="ID du fichier existant pour ajouter les données"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Upload et traitement d'un fichier de coûts salariaux - Basé sur le projet CS qui fonctionnait
    """
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv")
    
    try:
        content = await file.read()
        logger.info(f"Upload - Début traitement fichier: {file.filename}, taille: {len(content)} bytes")
        
        # Lecture du fichier avec la logique du projet CS
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(content))
            logger.info("Fichier CSV lu avec succès")
        else:
            # Essayer différentes approches pour lire le fichier Excel (logique du projet CS)
            df = None
            
            # Méthode 1: Essayer avec 2 lignes d'en-tête
            try:
                raw_df = pd.read_excel(BytesIO(content), header=[0, 1])
                logger.info("Lecture avec 2 lignes d'en-tête réussie")
                
                # Fusionner les deux lignes d'en-tête
                new_columns = []
                for col in raw_df.columns:
                    if str(col[1]).lower() == 'nan' or str(col[1]).strip() == '' or str(col[1]).startswith('Unnamed'):
                        new_columns.append(str(col[0]).strip())
                    else:
                        new_columns.append(f"{str(col[0]).strip()} {str(col[1]).strip()}")
                
                raw_df.columns = new_columns
                df = raw_df
                logger.info("Colonnes après fusion:", list(df.columns))
                
            except Exception as e1:
                logger.info(f"Échec lecture avec 2 lignes: {e1}")
                
                # Méthode 2: Essayer avec 1 ligne d'en-tête
                try:
                    df = pd.read_excel(BytesIO(content), header=0)
                    logger.info("Lecture avec 1 ligne d'en-tête réussie")
                except Exception as e2:
                    logger.info(f"Échec lecture avec 1 ligne: {e2}")
                    
                    # Méthode 3: Lire sans en-tête et utiliser la première ligne
                    try:
                        df = pd.read_excel(BytesIO(content), header=None)
                        logger.info("Lecture sans en-tête réussie")
                        # Utiliser la première ligne comme en-tête
                        df.columns = df.iloc[0]
                        df = df.iloc[1:].reset_index(drop=True)
                        logger.info("Colonnes après ajustement:", list(df.columns))
                    except Exception as e3:
                        logger.error(f"Échec lecture sans en-tête: {e3}")
                        raise HTTPException(status_code=500, detail="Impossible de lire le fichier Excel")
        
        # Définir les colonnes attendues (même que le projet CS)
        colonnes = [
            "Matricule", "Salarié", "Service", "P / HP", "Mois", 
            "Heures théoriques", "Heures normales", "Heures majorées", "Total heures", 
            "Effectif", "CP Pris", "RTT/Réci Pris", "Heures réelles", "Brut", 
            "Charges salariales", "Charges patronales", "% charge patronales", 
            "Suppléments coût global", "Coût global", "Coût hora moyen", "PAS", 
            "Net à payer", "Forfait jour", "Entrée", "Sortie", "Emploi", "Etablissement"
        ]
        
        # Mapping spécifique pour les colonnes problématiques (du projet CS)
        mapping_colonnes = {
            'RTT/Réci Pris': ['RTT/Recup Pris', 'RTT/Réci Pris', 'RTT/Recup', 'RTT/Réci', 'RTT', 'Recup Pris', 'Réci Pris', 'RTT/Récup Pris', 'RTT/Récup', 'RTT/Récup Pris'],
            'Coût hora moyen': ['Coût hora moyen', 'Cout hora moyen', 'Coût horaire moyen'],
            '% charge patronales': ['% charge patronales', '% patronales', 'Pourcentage patronales', '% charges patronales'],
            'CP Pris': ['CP Pris', 'CP', 'Congés Pris'],
            'Heures théoriques': ['Heures théoriques', 'Théoriques', 'Heures theoriques'],
            'Heures normales': ['Heures normales', 'Normales'],
            'Heures majorées': ['Heures majorées', 'Majorées'],
            'Total heures': ['Total heures', 'Total', 'Heures total'],
            'Heures réelles': ['Heures réelles', 'Réelles'],
            'Charges salariales': ['Charges salariales', 'Charges salariales', 'Salariales'],
            'Charges patronales': ['Charges patronales', 'Patronales'],
            'Suppléments coût global': ['Suppléments coût global', 'Suppléments', 'Coût global supplément'],
            'Coût global': ['Coût global', 'Cout global', 'Global'],
            'Net à payer': ['Net à payer', 'Net a payer', 'Net'],
            'Forfait jour': ['Forfait jour', 'Forfait'],
            'P / HP': ['P / HP', 'P/HP', 'P HP', 'P-HP']
        }
        
        logger.info("Colonnes attendues:", colonnes)
        logger.info("Colonnes disponibles:", list(df.columns))
        
        # Créer un DataFrame avec les colonnes dans l'ordre exact (logique du projet CS)
        result_df = pd.DataFrame()
        for colonne in colonnes:
            if colonne in df.columns:
                result_df[colonne] = df[colonne]
                logger.info(f"Colonne trouvée exactement: {colonne}")
            else:
                # Chercher dans le mapping spécifique
                found = False
                if colonne in mapping_colonnes:
                    for variation in mapping_colonnes[colonne]:
                        if variation in df.columns:
                            result_df[colonne] = df[variation]
                            found = True
                            logger.info(f"Mapping spécifique: {variation} -> {colonne}")
                            break
                
                # Si pas trouvé dans le mapping, chercher des colonnes similaires
                if not found:
                    for col in df.columns:
                        # Normaliser les chaînes pour la comparaison
                        col_normalized = col.lower().replace('é', 'e').replace('è', 'e').replace('à', 'a').replace('/', '').replace(' ', '')
                        colonne_normalized = colonne.lower().replace('é', 'e').replace('è', 'e').replace('à', 'a').replace('/', '').replace(' ', '')
                        
                        if colonne_normalized in col_normalized or col_normalized in colonne_normalized:
                            result_df[colonne] = df[col]
                            found = True
                            logger.info(f"Mapping intelligent: {col} -> {colonne}")
                            break
                
                if not found:
                    result_df[colonne] = None
                    logger.info(f"Colonne non trouvée: {colonne}")
        
        # Nettoyer les données
        result_df = result_df.replace({pd.NA: None, pd.NaT: None, np.nan: None})
        
        # Convertir les timestamps en string pour la sérialisation JSON
        for col in result_df.columns:
            if result_df[col].dtype == 'datetime64[ns]':
                result_df[col] = result_df[col].dt.strftime('%Y-%m-%d')
        
        # Convertir aussi les pandas Timestamp en string
        data = result_df.to_dict(orient='records')
        for row in data:
            for key, value in row.items():
                if hasattr(value, 'strftime'):  # Si c'est un timestamp
                    row[key] = value.strftime('%Y-%m-%d') if value is not None else None
        
        logger.info(f"Données traitées: {len(data)} lignes")
        if len(data) > 0:
            logger.info("Première ligne:", data[0])
        
        appended = False
        if append_to_file_id:
            # Ajouter à un fichier existant (logique du projet CS)
            try:
                existing_file = crud.get_couts_salariaux_file(db, append_to_file_id)
                if not existing_file:
                    raise HTTPException(status_code=404, detail="Fichier de destination non trouvé")
                
                # Charger les données existantes
                existing_data = json.loads(existing_file.processed_data)
                logger.info(f"Données existantes: {len(existing_data)} lignes")
                
                # Normaliser les nouvelles données pour correspondre aux colonnes existantes
                normalized_new_data = []
                
                # Créer un dictionnaire des services et P/HP par salarié à partir des données existantes
                salarie_info = {}
                for existing_row in existing_data:
                    salarie_name = existing_row.get("Salarié")
                    if salarie_name:
                        salarie_info[salarie_name] = {
                            "Service": existing_row.get("Service"),
                            "P / HP": existing_row.get("P / HP")
                        }
                
                for row in data:
                    normalized_row = {}
                    for col in existing_data[0].keys() if existing_data else colonnes:
                        # Logique intelligente pour Service et P/HP
                        if col == "Service" and col not in row:
                            salarie_name = row.get("Salarié")
                            if salarie_name and salarie_name in salarie_info:
                                normalized_row[col] = salarie_info[salarie_name]["Service"]
                            else:
                                normalized_row[col] = "Non spécifié"
                        elif col == "P / HP" and col not in row:
                            salarie_name = row.get("Salarié")
                            if salarie_name and salarie_name in salarie_info:
                                normalized_row[col] = salarie_info[salarie_name]["P / HP"]
                            else:
                                normalized_row[col] = "Non spécifié"
                        else:
                            normalized_row[col] = row.get(col, None)
                    normalized_new_data.append(normalized_row)
                
                # Concaténer les données
                combined_data = existing_data + normalized_new_data
                
                # Mettre à jour le fichier existant
                file_update = schemas.CoutsSalariauxFileUpdate(
                    processed_data=json.dumps(combined_data, ensure_ascii=False),
                    total_records=len(combined_data)
                )
                db_file = crud.update_couts_salariaux_file(db, append_to_file_id, file_update)
                appended = True
                logger.info(f"Upload - Données ajoutées au fichier existant ID: {append_to_file_id}")
                
            except Exception as append_error:
                logger.error(f"Erreur lors de l'ajout de données: {append_error}")
                raise HTTPException(status_code=500, detail=f"Erreur lors de l'ajout: {str(append_error)}")
        else:
            # Créer un nouveau fichier
            file_data = schemas.CoutsSalariauxFileCreate(
                filename=file.filename,
                processed_data=json.dumps(data, ensure_ascii=False),
                total_records=len(data)
            )
            db_file = crud.create_couts_salariaux_file(db, file_data, current_user.id)
            logger.info(f"Upload - Nouveau fichier créé avec ID: {db_file.id}")
        
        return schemas.CoutsSalariauxUploadResponse(
            success=True,
            file_id=db_file.id,
            appended=appended,
            total_records=db_file.total_records
        )
        
    except Exception as e:
        logger.error(f"Upload - Erreur lors du traitement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du traitement: {str(e)}")

@router.post("/upload-couts-salariaux", response_model=schemas.CoutsSalariauxUploadResponse)
async def upload_couts_salariaux_alias(
    file: UploadFile = File(...),
    append_to_file_id: Optional[int] = Form(None, description="ID du fichier existant pour ajouter les données"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Alias pour l'upload (compatibilité frontend)
    """
    return await upload_couts_salariaux(file, append_to_file_id, db, current_user)

@router.get("/files")
async def list_couts_salariaux_files(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Liste tous les fichiers de coûts salariaux
    """
    try:
        files = crud.get_couts_salariaux_files(db)
        return {
            "success": True,
            "files": [
                {
                    "id": file.id,
                    "filename": file.filename,
                    "uploaded_at": file.uploaded_at.isoformat(),
                    "total_records": file.total_records
                }
                for file in files
            ]
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des fichiers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des fichiers: {str(e)}")

@router.get("/files/{file_id}")
async def get_couts_salariaux_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Récupère les données d'un fichier de coûts salariaux
    """
    try:
        file = crud.get_couts_salariaux_file(db, file_id)
        if not file:
            raise HTTPException(status_code=404, detail="Fichier non trouvé")
        
        data = json.loads(file.processed_data)
        return {
            "success": True,
            "data": data,
            "file_info": {
                "id": file.id,
                "filename": file.filename,
                "uploaded_at": file.uploaded_at.isoformat(),
                "total_records": file.total_records
            }
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des données du fichier: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des données: {str(e)}")

@router.put("/files/{file_id}", response_model=schemas.CoutsSalariauxFile)
async def update_couts_salariaux_file(
    file_id: int,
    file_update: schemas.CoutsSalariauxFileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Met à jour un fichier de coûts salariaux
    """
    file = crud.update_couts_salariaux_file(db, file_id, file_update)
    if not file:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return file

@router.delete("/files/{file_id}")
async def delete_couts_salariaux_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Supprime un fichier de coûts salariaux
    """
    success = crud.delete_couts_salariaux_file(db, file_id)
    if not success:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return {"message": "Fichier supprimé avec succès"}

@router.post("/notify-data-loaded")
async def notify_data_loaded():
    """
    Notification que les données ont été chargées (pour compatibilité frontend)
    """
    return {"message": "Données chargées"}
