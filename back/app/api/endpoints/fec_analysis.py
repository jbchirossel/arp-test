from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Dict, List, Any
from datetime import datetime
import pandas as pd
import io
import re
import math
import json
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app import models, schemas

router = APIRouter()

# Constantes pour éviter la duplication
LIBELLES_CHARGES_DIRECTES = [
    "ELECTRICITE", "FOURN.ENT.&P.OUT", "MATERIEL ET OUTILLAGE INTRACOM",
    "LOCATION AIR LIQUIDE", "EVACUATION DECHETS", "PERSONNEL EXTERIEUR A L' ENTREPRISE",
    "PERSONNEL DE PRODUCTION", "CHARGES SOCIALES PATRONALES P", "VAR.CP",
    "TRANSPORTS SUR ACHATS", "PORTS SUR VENTES"
]

LIBELLES_CHARGES_INDIRECTES = [
    "EAU", "GAZ", "CARB.LUBRIF.", "FOURNITURES ADMINISTRATIVES", "VETEMENTS DE TRAVAIL",
    "LOCATION VEHICULES", "CREDIT BAIL TOUR HASS ST20Y OCC", "LOCATION MATERIEL SETIN",
    "LOCAT.IMMOBIL.", "LOCATIONS DIVERSES", "LOCATION COPIEUR  RICOH", "LOCATION LOGICIEL",
    "LOCATION TOYOTA FK-120-KZ", "CHARGES LOCATIVES", "ENTRETIEN BIENS IMMOBILIERS",
    "ENTRETIEN MATERIEL ET OUTILLAGE", "ENT.MAT.TRANSP.", "ENTRETIEN MATERIEL DE BUREAU",
    "MAINTENANCE INFORMATIQUE", "MAINTENANCE", "ASSURANCES", "ASSURANCES ADI", "AXA HOMME CLE",
    "ABONNEMENT-FORMATION", "PRESTATIONS GAG", "PRESTATIONS CONSULTING", "HONORAIRES COMPTABLES",
    "HONORAIRES JURIDIQUES", "HONORAIRES DIVERS", "FRAIS D'ACTES & CONTENTIEUX",
    "ANNONCES ET INSERTIONS", "FRAIS /EFFETS", "FRAIS DE DEPLACEMENTS", "RECEPTIONS",
    "TELEPHONE", "AFFRANCHISSEMENT", "SERVICES BANCAIRES", "FRAIS FACTURATION FOURNISSEURS",
    "COTISATIONS", "IMPOTS ET TAXES", "PERSONNEL ADM &HORS PRO.", "CHARGES SOCIALES PATRONALES HP",
    "VAR.CP", "TRANSFERT DE CHARGES", "AUTRES PRODUITS ET CHARGES"
]

LIBELLES_EXCLUS_CALCUL_AUTO = [
    "EAU", "ASSURANCES", "ASSURANCES ADI", "AXA HOMME CLE", "ABONNEMENT-FORMATION",
    "PRESTATIONS GAG", "PRESTATIONS CONSULTING", "HONORAIRES COMPTABLES",
    "HONORAIRES JURIDIQUES", "HONORAIRES DIVERS", "FRAIS FACTURATION FOURNISSEURS",
    "IMPOTS ET TAXES", "PERSONNEL ADM &HORS PRO.", "CHARGES SOCIALES PATRONALES HP",
    "VAR.CP", "TRANSFERT DE CHARGES"
]

def _get_periode_from_entries(entries: List[Dict]) -> str:
    """Utilitaire pour récupérer la période depuis les entrées"""
    date_str = entries[0].get('EcritureDate') if entries else None
    return extract_month_year(date_str)

def _aggregate_by_compte(entries: List[Dict], libelles_filter: List[str], exclude_libelles: List[str] = None) -> Dict[str, Dict[str, Any]]:
    """Utilitaire pour agréger les entrées par compte"""
    exclude_libelles = exclude_libelles or []
    mois_annee = _get_periode_from_entries(entries)
    result_dict = {}
    
    for entry in entries:
        try:
            lib = entry.get('CompteLib', '').upper().strip()
            if lib in libelles_filter and lib not in exclude_libelles:
                debit = float(entry.get('Debit', 0))
                compte_lib = entry.get('CompteLib', '')
                compte_num = str(entry.get('CompteNum', ''))
                
                key = f"{compte_lib}_{compte_num}"
                if key not in result_dict:
                    result_dict[key] = {
                        "CompteLib": compte_lib,
                        "CompteNum": compte_num,
                        "montant": 0,
                        "mois_annee": mois_annee
                    }
                result_dict[key]["montant"] += debit
        except Exception:
            continue
    
    return result_dict

def extract_month_year(date_str: str) -> str:
    """Extrait et formate le mois/année depuis une date"""
    if not date_str:
        return "Période"
    
    try:
        date_str_clean = str(date_str).strip()
        
        # NOUVEAU : Gérer les numéros de série Excel (comme 45777)
        if date_str_clean.isdigit():
            try:
                excel_serial = int(date_str_clean)
                # Convertir le numéro de série Excel en date
                # Excel compte les jours depuis le 1er janvier 1900
                # Mais attention : Excel considère à tort 1900 comme une année bissextile
                if excel_serial >= 60:  # Après le 29 février 1900 fictif
                    excel_serial -= 1
                
                # Date de base : 1er janvier 1900
                from datetime import date, timedelta
                base_date = date(1900, 1, 1)
                actual_date = base_date + timedelta(days=excel_serial - 1)
                
                # Convertir en format souhaité
                mois_fr = {
                    1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
                    5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
                    9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
                }
                
                return f"{mois_fr[actual_date.month]} {actual_date.year}"
                
            except (ValueError, OverflowError, KeyError):
                pass
        
        # Essayer différents formats de date classiques
        for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%d/%m/%y', '%Y-%m-%d %H:%M:%S']:
            try:
                date_obj = datetime.strptime(date_str_clean, fmt)
                # Format français avec majuscule
                mois_annee = date_obj.strftime('%B %Y').capitalize()
                # Traduire les mois en français
                mois_fr = {
                    'January': 'Janvier', 'February': 'Février', 'March': 'Mars',
                    'April': 'Avril', 'May': 'Mai', 'June': 'Juin',
                    'July': 'Juillet', 'August': 'Août', 'September': 'Septembre',
                    'October': 'Octobre', 'November': 'Novembre', 'December': 'Décembre'
                }
                for en, fr in mois_fr.items():
                    mois_annee = mois_annee.replace(en, fr)
                return mois_annee
            except ValueError:
                continue
        
        # Si aucun format ne fonctionne, essayer de parser manuellement
        if '/' in date_str_clean:
            parts = date_str_clean.split('/')
            if len(parts) >= 2:
                try:
                    month = int(parts[1])
                    year = int(parts[2]) if len(parts) > 2 else 2024
                    date_obj = datetime(year, month, 1)
                    mois_annee = date_obj.strftime('%B %Y').capitalize()
                    # Traduire les mois en français
                    mois_fr = {
                        'January': 'Janvier', 'February': 'Février', 'March': 'Mars',
                        'April': 'Avril', 'May': 'Mai', 'June': 'Juin',
                        'July': 'Juillet', 'August': 'Août', 'September': 'Septembre',
                        'October': 'Octobre', 'November': 'Novembre', 'December': 'Décembre'
                    }
                    for en, fr in mois_fr.items():
                        mois_annee = mois_annee.replace(en, fr)
                    return mois_annee
                except (ValueError, IndexError):
                    pass
    except Exception:
        pass
    
    return "Période"

def normalize_p_hp_field(p_hp_raw: str) -> str:
    """
    Normalise le champ P/HP pour déterminer si c'est Production ou Administration
    """
    if not p_hp_raw:
        return "ADMINISTRATION"  # Par défaut, si vide
    
    p_hp_clean = str(p_hp_raw).upper().strip()
    
    # Variations connues pour Production
    production_values = [
        'P', 'PROD', 'PRODUCTION', 'PRODUCTIF', 'PRODUCTEUR',
        'ATELIER', 'FABRICATION', 'USINE', 'TECHNIQUE', 'OPERATEUR'
    ]
    
    # Variations connues pour Administration/Hors Production
    admin_values = [
        'HP', 'HORS PROD', 'HORS PRODUCTION', 'ADMINISTRATION', 'ADMIN', 
        'ADMINISTRATIF', 'BUREAU', 'COMMERCIAL', 'VENTE', 'COMPTABILITE',
        'DIRECTION', 'MANAGEMENT', 'SECRETARIAT', 'RH', 'QUALITE'
    ]
    
    # Recherche exacte
    if p_hp_clean in production_values:
        return "PRODUCTION"
    
    if p_hp_clean in admin_values:
        return "ADMINISTRATION"
    
    # Recherche partielle
    for prod_val in production_values:
        if prod_val in p_hp_clean:
            return "PRODUCTION"
    
    for admin_val in admin_values:
        if admin_val in p_hp_clean:
            return "ADMINISTRATION"
    
    # Si on ne reconnaît pas, on regarde si ça ressemble à Production (P) ou Administration (HP)
    if 'P' == p_hp_clean or p_hp_clean.startswith('P'):
        return "PRODUCTION"
    
    # Par défaut, considérer comme Administration
    return "ADMINISTRATION"

def normalize_month_from_raw(mois_raw: str) -> str:
    """
    Normalise le format de mois des coûts salariaux pour le comparer avec le format FEC
    (Version simplifiée pour l'analyse FEC)
    """
    if not mois_raw:
        return "Période inconnue"
    
    try:
        date_str = str(mois_raw).strip()
        
        # Si c'est déjà au bon format (ex: "Janvier 2024")
        if any(month in date_str for month in ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                                               'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']):
            return date_str
        
        # NOUVEAU : Gérer les numéros de série Excel (comme 45777)
        if date_str.isdigit():
            try:
                excel_serial = int(date_str)
                # Convertir le numéro de série Excel en date
                if excel_serial >= 60:  # Après le 29 février 1900 fictif
                    excel_serial -= 1
                
                from datetime import date, timedelta
                base_date = date(1900, 1, 1)
                actual_date = base_date + timedelta(days=excel_serial - 1)
                
                # Convertir en format souhaité
                mois_fr = {
                    1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
                    5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
                    9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
                }
                
                return f"{mois_fr[actual_date.month]} {actual_date.year}"
                
            except (ValueError, OverflowError, KeyError):
                pass
        
        # Format YYYY-MM-DD
        if '-' in date_str and len(date_str) >= 7:
            try:
                from datetime import datetime
                date_obj = datetime.strptime(date_str[:10], '%Y-%m-%d')
            except ValueError:
                try:
                    date_obj = datetime.strptime(date_str[:7], '%Y-%m')
                except ValueError:
                    return f"Période {date_str}"
        
        # Format DD/MM/YYYY
        elif '/' in date_str:
            try:
                from datetime import datetime
                date_obj = datetime.strptime(date_str[:10], '%d/%m/%Y')
            except ValueError:
                try:
                    parts = date_str.split('/')
                    if len(parts) >= 2:
                        month = int(parts[1])
                        year = int(parts[2]) if len(parts) > 2 else 2024
                        date_obj = datetime(year, month, 1)
                    else:
                        return f"Période {date_str}"
                except (ValueError, IndexError):
                    return f"Période {date_str}"
        else:
            return f"Période {date_str}"
        
        # Si on arrive ici, on a une date valide
        mois_fr = {
            1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
            5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
            9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
        }
        
        return f"{mois_fr[date_obj.month]} {date_obj.year}"
        
    except Exception:
        return f"Période {mois_raw}"

def get_couts_salariaux_for_month(mois_annee: str, db: Session) -> Dict[str, float]:
    """Récupère les coûts salariaux pour un mois donné depuis la base de données"""
    try:
        # Chercher dans les fichiers de coûts salariaux
        files = db.query(models.CoutsSalariauxFile).all()
        
        for file in files:
            try:
                # Les données sont stockées comme une liste directe
                data_list = json.loads(file.processed_data)
                
                if data_list:
                    # Calculer les agrégations pour ce mois à partir des données brutes
                    personnel_production = 0
                    charges_patronales_p = 0
                    personnel_adm = 0
                    charges_patronales_hp = 0
                    supplements_p = 0
                    supplements_hp = 0
                    
                    for row in data_list:
                        try:
                            # Vérifier si cette ligne correspond au mois recherché
                            row_mois = normalize_month_from_raw(row.get('Mois', ''))
                            if row_mois != mois_annee:
                                continue
                            
                            # Récupérer les montants
                            brut = float(row.get('Brut', 0) or 0)
                            charges_patronales = float(row.get('Charges patronales', 0) or 0)
                            supplements = float(row.get('Suppléments coût global', 0) or 0)
                            p_hp_raw = row.get('P / HP', '')
                            
                            # Normalisation intelligente du champ P/HP
                            p_hp_normalized = normalize_p_hp_field(p_hp_raw)
                            
                            # Ajouter aux totaux selon le type P/HP
                            if p_hp_normalized == 'PRODUCTION':
                                personnel_production += brut
                                charges_patronales_p += charges_patronales
                                supplements_p += supplements
                            else:  # ADMINISTRATION ou autre
                                personnel_adm += brut
                                charges_patronales_hp += charges_patronales
                                supplements_hp += supplements
                        
                        except (ValueError, TypeError):
                            continue
                    
                    if personnel_production > 0 or personnel_adm > 0 or supplements_p > 0 or supplements_hp > 0:
                        return {
                            'personnel_production': round(personnel_production, 2),
                            'charges_patronales_p': round(charges_patronales_p, 2),
                            'supplements_p': round(supplements_p, 2),
                            'personnel_adm': round(personnel_adm, 2),
                            'charges_patronales_hp': round(charges_patronales_hp, 2),
                            'supplements_hp': round(supplements_hp, 2),
                            'total_production': round(personnel_production + charges_patronales_p + supplements_p, 2),
                            'total_adm': round(personnel_adm + charges_patronales_hp + supplements_hp, 2)
                        }
                
            except (json.JSONDecodeError, KeyError, TypeError):
                continue
        
        # Retourner des valeurs par défaut si aucune donnée trouvée
        return {
            'personnel_production': 0,
            'charges_patronales_p': 0,
            'supplements_p': 0,
            'personnel_adm': 0,
            'charges_patronales_hp': 0,
            'supplements_hp': 0,
            'total_production': 0,
            'total_adm': 0
        }
    except Exception:
        return {
            'personnel_production': 0,
            'charges_patronales_p': 0,
            'supplements_p': 0,
            'personnel_adm': 0,
            'charges_patronales_hp': 0,
            'supplements_hp': 0,
            'total_production': 0,
            'total_adm': 0
        }

def calculer_production_exercice(entries: List[Dict]) -> Dict[str, Any]:
    """Calcule la production de l'exercice (comptes 7xxx)"""
    total = 0
    
    for entry in entries:
        try:
            compte_num = str(entry.get('CompteNum', '')).strip()
            credit = float(entry.get('Credit', 0))
            
            if compte_num and compte_num.startswith('7'):
                total += credit
        except (ValueError, TypeError):
            continue
    
    # Récupérer la date pour le titre
    date_str = entries[0].get('EcritureDate') if entries else None
    mois_annee = extract_month_year(date_str)
    
    return {
        "titre": "Production de l'exercice",
        "mois_annee": mois_annee,
        "total": round(total, 2)
    }

def calculer_achats_consommes(entries: List[Dict]) -> Dict[str, Any]:
    """Calcule les achats consommés (matières premières + sous-traitance)"""
    matieres_premieres = 0
    sous_traitance = 0
    
    for entry in entries:
        try:
            compte_num = str(entry.get('CompteNum', '')).strip()
            debit = float(entry.get('Debit', 0))
            
            # Achats matières premières (601, 602, 603)
            if compte_num and re.match(r'^(601|602|603)', compte_num):
                matieres_premieres += debit
            
            # Achats sous-traitance (604)
            elif compte_num and compte_num.startswith('604'):
                sous_traitance += debit
        except (ValueError, TypeError):
            continue
    
    total = matieres_premieres + sous_traitance
    
    # Récupérer la date pour le titre
    date_str = entries[0].get('EcritureDate') if entries else None
    mois_annee = extract_month_year(date_str)
    
    return {
        "titre": "Achats consommés",
        "mois_annee": mois_annee,
        "total": round(total, 2),
        "matieres_premieres": round(matieres_premieres, 2),
        "sous_traitance": round(sous_traitance, 2)
    }

def calculer_charges_directes(entries: List[Dict], couts_salariaux: Dict[str, float]) -> List[Dict[str, Any]]:
    """Calcule les charges directes"""
    mois_annee = _get_periode_from_entries(entries)
    
    # Calculer VAR.CP = (charges brut prod + charges patronales prod) * 0.1
    personnel_production = couts_salariaux.get('personnel_production', 0)
    charges_patronales_p = couts_salariaux.get('charges_patronales_p', 0)
    var_cp = (personnel_production + charges_patronales_p) * 0.1
    
    # Agréger les charges directes
    result_dict = _aggregate_by_compte(entries, LIBELLES_CHARGES_DIRECTES, LIBELLES_EXCLUS_CALCUL_AUTO)
    
    # NOUVEAU: Ajouter les coûts salariaux de production dans les charges directes
    if personnel_production > 0:
        result_dict["PERSONNEL_PRODUCTION_CS"] = {
            "CompteLib": "PERSONNEL DE PRODUCTION",
            "CompteNum": "coûts salariaux",
            "montant": round(personnel_production, 2),
            "mois_annee": mois_annee
        }
    
    if charges_patronales_p > 0:
        result_dict["CHARGES_PATRONALES_P_CS"] = {
            "CompteLib": "CHARGES SOCIALES PATRONALES P",
            "CompteNum": "coûts salariaux",
            "montant": round(charges_patronales_p, 2),
            "mois_annee": mois_annee
        }
    
    # Ajouter VAR.CP calculé automatiquement
    result_dict["VAR.CP_CALCULE"] = {
        "CompteLib": "VAR.CP",
        "CompteNum": "calculé",
        "montant": round(var_cp, 2),
        "mois_annee": mois_annee
    }
    
    return list(result_dict.values())

def calculer_charges_indirectes(entries: List[Dict], couts_salariaux: Dict[str, float]) -> List[Dict[str, Any]]:
    """Calcule les charges indirectes"""
    # Libellés à exclure du calcul automatique (saisie manuelle)
    libelles_exclus = [
        "EAU", "ASSURANCES", "ASSURANCES ADI", "AXA HOMME CLE", "ABONNEMENT-FORMATION",
        "PRESTATIONS GAG", "PRESTATIONS CONSULTING", "HONORAIRES COMPTABLES",
        "HONORAIRES JURIDIQUES", "HONORAIRES DIVERS", "FRAIS FACTURATION FOURNISSEURS",
        "IMPOTS ET TAXES", "PERSONNEL ADM &HORS PRO.", "CHARGES SOCIALES PATRONALES HP",
        "VAR.CP", "TRANSFERT DE CHARGES"
    ]
    
    # Agréger les charges indirectes (excluant les libellés manuels)
    result_dict = _aggregate_by_compte(entries, LIBELLES_CHARGES_INDIRECTES, libelles_exclus)
    
    # Récupérer la date pour le titre
    date_str = entries[0].get('EcritureDate') if entries else None
    mois_annee = extract_month_year(date_str)
    
    # Calculer COTISATIONS automatiquement
    total_cotisations = 0
    for entry in entries:
        try:
            lib = entry.get('CompteLib', '').upper().strip()
            if lib == 'COTISATIONS':
                total_cotisations += float(entry.get('Debit', 0))
        except Exception:
            continue
    
    # Ajouter COTISATIONS (détecté automatiquement)
    result_dict["COTISATIONS_AUTO"] = {
        "CompteLib": "COTISATIONS",
        "CompteNum": "détecté automatiquement",
        "montant": total_cotisations,
        "mois_annee": mois_annee
    }
    
    # Calculer AUTRES PRODUITS ET CHARGES selon la logique de l'ancien système
    libelles_exclus_pour_autres = [
        "EAU", "GAZ", "CARB.LUBRIF.", "FOURNITURES ADMINISTRATIVES", "VETEMENTS DE TRAVAIL",
        "LOCATION VEHICULES", "CREDIT BAIL TOUR HASS ST20Y OCC", "LOCATION MATERIEL SETIN",
        "LOCAT.IMMOBIL.", "LOCATIONS DIVERSES", "LOCATION COPIEUR  RICOH", "LOCATION LOGICIEL",
        "LOCATION TOYOTA FK-120-KZ", "CHARGES LOCATIVES", "ENTRETIEN BIENS IMMOBILIERS",
        "ENTRETIEN MATERIEL ET OUTILLAGE", "ENT.MAT.TRANSP.", "ENTRETIEN MATERIEL DE BUREAU",
        "MAINTENANCE INFORMATIQUE", "MAINTENANCE", "ASSURANCES", "ASSURANCES ADI", "AXA HOMME CLE",
        "ABONNEMENT-FORMATION", "PRESTATIONS GAG", "PRESTATIONS CONSULTING", "HONORAIRES COMPTABLES",
        "HONORAIRES JURIDIQUES", "HONORAIRES DIVERS", "FRAIS D'ACTES & CONTENTIEUX",
        "ANNONCES ET INSERTIONS", "FRAIS /EFFETS", "FRAIS DE DEPLACEMENTS", "RECEPTIONS",
        "TELEPHONE", "AFFRANCHISSEMENT", "SERVICES BANCAIRES", "FRAIS FACTURATION FOURNISSEURS",
        "COTISATIONS", "ELECTRICITE", "FOURN.ENT.&P.OUT", "MATERIEL ET OUTILLAGE INTRACOM",
        "LOCATION AIR LIQUIDE", "EVACUATION DECHETS", "PERSONNEL EXTERIEUR A L' ENTREPRISE",
        "TRANSPORTS SUR ACHATS", "PORTS SUR VENTES"
    ]
    
    total_autres = 0
    for entry in entries:
        try:
            compte_num = str(entry.get('CompteNum', '')).strip()
            lib = entry.get('CompteLib', '').upper().strip()
            debit = float(entry.get('Debit', 0))
            
            # Vérifier si le compte est exclu (601-609, 63-69)
            is_compte_exclu = any(compte_num.startswith(prefix) for prefix in ['601', '602', '603', '604', '63', '64', '65', '66', '67', '68', '69'])
            is_libelle_exclu = lib in libelles_exclus_pour_autres
            
            # Ne prendre que les comptes de charges (comptes 6) et pas les comptes de produits (comptes 7)
            is_compte_charges = compte_num.startswith('6')
            
            if is_compte_charges and not is_compte_exclu and not is_libelle_exclu:
                total_autres += debit
        except Exception:
            continue
    
    # Ajouter AUTRES PRODUITS ET CHARGES (calculé automatiquement)
    result_dict["AUTRES_PRODUITS_ET_CHARGES_AUTO"] = {
        "CompteLib": "AUTRES PRODUITS ET CHARGES",
        "CompteNum": "calculé automatiquement",
        "montant": total_autres,
        "mois_annee": mois_annee
    }
    
    # NOUVEAU: Ajouter les coûts salariaux d'administration dans les charges indirectes
    personnel_adm = couts_salariaux.get('personnel_adm', 0)
    charges_patronales_hp = couts_salariaux.get('charges_patronales_hp', 0)
    
    if personnel_adm > 0:
        result_dict["PERSONNEL_ADM_CS"] = {
            "CompteLib": "PERSONNEL ADM &HORS PRO.",
            "CompteNum": "coûts salariaux",
            "montant": round(personnel_adm, 2),
            "mois_annee": mois_annee
        }
    
    if charges_patronales_hp > 0:
        result_dict["CHARGES_PATRONALES_HP_CS"] = {
            "CompteLib": "CHARGES SOCIALES PATRONALES HP",
            "CompteNum": "coûts salariaux",
            "montant": round(charges_patronales_hp, 2),
            "mois_annee": mois_annee
        }
    
    # Ajouter les cases pour saisie manuelle avec montant à 0
    cases_manuelles = [
        "IMPOTS ET TAXES", "VAR.CP", "TRANSFERT DE CHARGES", "FRAIS FACTURATION FOURNISSEURS", "ASSURANCES",
        "ASSURANCES ADI", "AXA HOMME CLE", "ABONNEMENT-FORMATION", "PRESTATIONS GAG",
        "PRESTATIONS CONSULTING", "HONORAIRES COMPTABLES", "HONORAIRES JURIDIQUES",
        "HONORAIRES DIVERS", "EAU", "AUTRES PRODUITS ET CHARGES"
    ]
    
    for case in cases_manuelles:
        case_key = f"{case}_MANUEL"
        result_dict[case_key] = {
            "CompteLib": case,
            "CompteNum": "modifiable",
            "montant": 0,
            "mois_annee": mois_annee
        }
    
    return list(result_dict.values())

def calculer_impots_et_taxes(entries: List[Dict]) -> List[Dict[str, Any]]:
    """Calcule les impôts et taxes"""
    libelles_impots = [
        "IMPOTS ET TAXES", "TAXE FONCIERE", "TAXE D'HABITATION", "COTISATION FONCIERE",
        "COTISATION VALEUR AJOUTEE", "CVAE", "CET", "CVAE", "CET", "CVAE", "CET"
    ]
    
    # Récupérer la date pour le titre
    date_str = entries[0].get('EcritureDate') if entries else None
    mois_annee = extract_month_year(date_str)
    
    # Agréger par CompteLib et CompteNum
    result_dict = {}
    for entry in entries:
        try:
            lib = entry.get('CompteLib', '').upper().strip()
            if lib in libelles_impots:
                debit = float(entry.get('Debit', 0))
                compte_lib = entry.get('CompteLib', '')
                compte_num = str(entry.get('CompteNum', ''))
                
                # Clé unique pour l'agrégation
                key = f"{compte_lib}_{compte_num}"
                
                if key not in result_dict:
                    result_dict[key] = {
                        "CompteLib": compte_lib,
                        "CompteNum": compte_num,
                        "montant": 0,
                        "mois_annee": mois_annee
                    }
                
                result_dict[key]["montant"] += debit
        except Exception:
            continue
    
    return list(result_dict.values())

def calculer_personnel_adm_hors_pro(entries: List[Dict]) -> List[Dict[str, Any]]:
    """Calcule le personnel administratif et hors production"""
    libelles_personnel = [
        "PERSONNEL ADM &HORS PRO.", "PERSONNEL ADMINISTRATIF", "PERSONNEL HORS PRODUCTION",
        "CHARGES SOCIALES PATRONALES HP", "CHARGES SOCIALES HP"
    ]
    
    # Récupérer la date pour le titre
    date_str = entries[0].get('EcritureDate') if entries else None
    mois_annee = extract_month_year(date_str)
    
    # Agréger par CompteLib et CompteNum
    result_dict = {}
    for entry in entries:
        try:
            lib = entry.get('CompteLib', '').upper().strip()
            if lib in libelles_personnel:
                debit = float(entry.get('Debit', 0))
                compte_lib = entry.get('CompteLib', '')
                compte_num = str(entry.get('CompteNum', ''))
                
                # Clé unique pour l'agrégation
                key = f"{compte_lib}_{compte_num}"
                
                if key not in result_dict:
                    result_dict[key] = {
                        "CompteLib": compte_lib,
                        "CompteNum": compte_num,
                        "montant": 0,
                        "mois_annee": mois_annee
                    }
                
                result_dict[key]["montant"] += debit
        except Exception:
            continue
    
    return list(result_dict.values())

def calculer_tresorerie(entries: List[Dict]) -> Dict[str, Any]:
    """Calcule la trésorerie (comptes 5xxx)"""
    total = 0
    
    for entry in entries:
        try:
            compte_num = str(entry.get('CompteNum', '')).strip()
            debit = float(entry.get('Debit', 0))
            credit = float(entry.get('Credit', 0))
            
            if compte_num and compte_num.startswith('5'):
                total += (debit - credit)
        except (ValueError, TypeError):
            continue
    
    # Récupérer la date pour le titre
    date_str = entries[0].get('EcritureDate') if entries else None
    mois_annee = extract_month_year(date_str)
    
    return {
        "titre": "Trésorerie",
        "mois_annee": mois_annee,
        "total": round(total, 2)
    }

@router.post("/upload", response_model=schemas.FECUploadResponse)
async def upload_fec(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Upload et analyse un fichier Excel FEC avec segmentation
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Format de fichier non supporté")
    
    try:
        # Lire le fichier Excel
        content = await file.read()
        
        try:
            df = pd.read_excel(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erreur lecture fichier Excel: {str(e)}")
        
        entries = df.to_dict('records')
        
        if len(entries) == 0:
            raise HTTPException(status_code=400, detail="Fichier vide ou format incorrect")
        
        # Récupérer le mois du FEC pour les coûts salariaux
        date_str = entries[0].get('EcritureDate') if entries else None
        mois_annee_fec = extract_month_year(date_str)
        
        # Récupérer les coûts salariaux depuis la base de données
        couts_salariaux = get_couts_salariaux_for_month(mois_annee_fec, db)
        
        # Appliquer tous les segments
        results = {
            "production": calculer_production_exercice(entries),
            "achats_consommes": calculer_achats_consommes(entries),
            "charges_directes": calculer_charges_directes(entries, couts_salariaux),
            "charges_indirectes": calculer_charges_indirectes(entries, couts_salariaux),
            "impots_et_taxes": calculer_impots_et_taxes(entries),
            "personnel_adm_hors_pro": calculer_personnel_adm_hors_pro(entries),
            "couts_salariaux": {
                "mois_annee": mois_annee_fec,
                "personnel_production": couts_salariaux['personnel_production'],
                "charges_patronales_p": couts_salariaux['charges_patronales_p'],
                "supplements_p": couts_salariaux['supplements_p'],
                "personnel_adm": couts_salariaux['personnel_adm'],
                "charges_patronales_hp": couts_salariaux['charges_patronales_hp'],
                "supplements_hp": couts_salariaux['supplements_hp'],
                "total_production": couts_salariaux['total_production'],
                "total_adm": couts_salariaux['total_adm']
            },
            "tresorerie": calculer_tresorerie(entries)
        }
        
        # Sauvegarder dans la base de données PostgreSQL
        fec_analysis = models.FECAnalysis(
            filename=file.filename,
            user_id=current_user.id,
            results=json.dumps(results)
        )
        db.add(fec_analysis)
        db.commit()
        db.refresh(fec_analysis)
        
        return {
            "status": "success",
            "filename": file.filename,
            "data": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du traitement: {str(e)}")

@router.get("/analyses", response_model=List[schemas.FECAnalysis])
async def get_fec_analyses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère toutes les analyses FEC de l'utilisateur"""
    analyses = db.query(models.FECAnalysis).filter(
        models.FECAnalysis.user_id == current_user.id
    ).order_by(models.FECAnalysis.upload_date.desc()).all()
    
    return analyses

@router.get("/analyses/{analysis_id}", response_model=schemas.FECAnalysis)
async def get_fec_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère une analyse FEC spécifique"""
    analysis = db.query(models.FECAnalysis).filter(
        models.FECAnalysis.id == analysis_id,
        models.FECAnalysis.user_id == current_user.id
    ).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analyse FEC non trouvée")
    
    return analysis

@router.delete("/analyses/{analysis_id}")
async def delete_fec_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Supprime une analyse FEC spécifique"""
    analysis = db.query(models.FECAnalysis).filter(
        models.FECAnalysis.id == analysis_id,
        models.FECAnalysis.user_id == current_user.id
    ).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analyse FEC non trouvée")
    
    db.delete(analysis)
    db.commit()
    
    return {"status": "success", "message": "Analyse supprimée avec succès"}

@router.get("/analyses/{analysis_id}/export")
async def export_fec_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Exporte une analyse FEC au format JSON"""
    analysis = db.query(models.FECAnalysis).filter(
        models.FECAnalysis.id == analysis_id,
        models.FECAnalysis.user_id == current_user.id
    ).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analyse FEC non trouvée")
    
    from fastapi.responses import JSONResponse
    
    return JSONResponse(
        content={
            "filename": analysis.filename,
            "upload_date": analysis.upload_date.isoformat(),
            "results": json.loads(analysis.results)
        },
        headers={
            "Content-Disposition": f"attachment; filename={analysis.filename}_export.json"
        }
    )

@router.post("/upload-fec", response_model=schemas.FECUploadResponse)
async def upload_fec_alias(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Alias pour l'upload FEC (compatibilité frontend)
    """
    return await upload_fec(file, db, current_user)

@router.get("/statistics")
async def get_fec_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère des statistiques globales sur les analyses FEC"""
    total_analyses = db.query(models.FECAnalysis).filter(
        models.FECAnalysis.user_id == current_user.id
    ).count()
    
    recent_analyses = db.query(models.FECAnalysis).filter(
        models.FECAnalysis.user_id == current_user.id
    ).order_by(models.FECAnalysis.upload_date.desc()).limit(5).all()
    
    return {
        "total_analyses": total_analyses,
        "recent_analyses": [
            {
                "id": analysis.id,
                "filename": analysis.filename,
                "upload_date": analysis.upload_date.isoformat()
            }
            for analysis in recent_analyses
        ]
    }

@router.get("/debug/couts-salariaux")
async def debug_couts_salariaux(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Endpoint de débogage pour vérifier les coûts salariaux disponibles"""
    try:
        files = db.query(models.CoutsSalariauxFile).all()
        debug_info = []
        
        for file in files:
            try:
                content = json.loads(file.processed_data)
                file_info = {
                    "id": file.id,
                    "filename": file.filename,
                    "upload_date": file.uploaded_at.isoformat() if file.uploaded_at else None,
                    "available_months": [],
                    "p_hp_analysis": {
                        "total_rows": 0,
                        "production_count": 0,
                        "administration_count": 0,
                        "unknown_count": 0,
                        "sample_p_hp_values": [],
                        "sample_rows": []
                    }
                }
                
                # Format liste directe - calculer les mois disponibles et analyser P/HP
                if isinstance(content, list):
                    months_set = set()
                    p_hp_values = []
                    
                    for i, row in enumerate(content):
                        mois_raw = row.get('Mois', '')
                        if mois_raw:
                            mois_normalized = normalize_month_from_raw(mois_raw)
                            months_set.add(mois_normalized)
                        
                        # Analyser P/HP
                        p_hp_raw = row.get('P / HP', '')
                        p_hp_normalized = normalize_p_hp_field(p_hp_raw)
                        p_hp_values.append(f"{p_hp_raw} -> {p_hp_normalized}")
                        
                        if p_hp_normalized == 'PRODUCTION':
                            file_info["p_hp_analysis"]["production_count"] += 1
                        elif p_hp_normalized == 'ADMINISTRATION':
                            file_info["p_hp_analysis"]["administration_count"] += 1
                        else:
                            file_info["p_hp_analysis"]["unknown_count"] += 1
                        
                        # Garder quelques échantillons pour debug
                        if i < 5:
                            file_info["p_hp_analysis"]["sample_rows"].append({
                                "salarie": row.get('Salarié', ''),
                                "service": row.get('Service', ''),
                                "p_hp_raw": p_hp_raw,
                                "p_hp_normalized": p_hp_normalized,
                                "brut": row.get('Brut', 0),
                                "charges_patronales": row.get('Charges patronales', 0),
                                "mois": mois_raw
                            })
                    
                    file_info["available_months"] = sorted(list(months_set))
                    file_info["p_hp_analysis"]["total_rows"] = len(content)
                    file_info["p_hp_analysis"]["sample_p_hp_values"] = list(set(p_hp_values))[:20]
                
                debug_info.append(file_info)
                
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                debug_info.append({
                    "id": file.id,
                    "filename": file.filename,
                    "error": f"Erreur de parsing: {str(e)}"
                })
        
        return {
            "total_files": len(files),
            "files_details": debug_info
        }
        
    except Exception as e:
        return {"error": f"Erreur lors du débogage: {str(e)}"}

@router.get("/debug/couts-salariaux/{mois_annee}")
async def debug_couts_salariaux_for_month(
    mois_annee: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Test de récupération des coûts salariaux pour un mois spécifique"""
    try:
        # Appeler la fonction de récupération
        result = get_couts_salariaux_for_month(mois_annee, db)
        
        # Récupérer aussi les détails bruts pour debug
        files = db.query(models.CoutsSalariauxFile).all()
        debug_details = []
        
        for file in files:
            try:
                data_list = json.loads(file.processed_data)
                matching_rows = []
                
                for row in data_list:
                    row_mois = normalize_month_from_raw(row.get('Mois', ''))
                    if row_mois == mois_annee:
                        p_hp_raw = row.get('P / HP', '')
                        p_hp_normalized = normalize_p_hp_field(p_hp_raw)
                        
                        matching_rows.append({
                            "salarie": row.get('Salarié', ''),
                            "service": row.get('Service', ''),
                            "p_hp_raw": p_hp_raw,
                            "p_hp_normalized": p_hp_normalized,
                            "brut": row.get('Brut', 0),
                            "charges_patronales": row.get('Charges patronales', 0)
                        })
                
                if matching_rows:
                    debug_details.append({
                        "file_id": file.id,
                        "filename": file.filename,
                        "matching_rows_count": len(matching_rows),
                        "rows": matching_rows[:10]  # Limite à 10 pour éviter trop de données
                    })
                        
            except (json.JSONDecodeError, KeyError, TypeError):
                continue
        
        return {
            "mois_demande": mois_annee,
            "result_agrege": result,
            "details_files": debug_details,
            "total_files_checked": len(files)
        }
        
    except Exception as e:
        return {"error": f"Erreur lors du test: {str(e)}"}

@router.get("/debug/test-excel-date/{excel_serial}")
async def test_excel_date_conversion(
    excel_serial: str,
    current_user: models.User = Depends(get_current_user)
):
    """Test de conversion d'un numéro de série Excel en date"""
    try:
        # Tester avec les deux fonctions
        fec_result = extract_month_year(excel_serial)
        couts_sal_result = normalize_month_from_raw(excel_serial)
        
        # Calcul manuel pour vérification
        manual_result = None
        if excel_serial.isdigit():
            try:
                from datetime import date, timedelta
                excel_num = int(excel_serial)
                if excel_num >= 60:
                    excel_num -= 1
                
                base_date = date(1900, 1, 1)
                actual_date = base_date + timedelta(days=excel_num - 1)
                manual_result = {
                    "date_calculated": actual_date.strftime('%Y-%m-%d'),
                    "day": actual_date.day,
                    "month": actual_date.month,
                    "year": actual_date.year
                }
            except Exception as e:
                manual_result = f"Erreur calcul manuel: {str(e)}"
        
        return {
            "excel_serial_input": excel_serial,
            "fec_analysis_result": fec_result,
            "couts_salariaux_result": couts_sal_result,
            "manual_calculation": manual_result,
            "matches": fec_result == couts_sal_result
        }
        
    except Exception as e:
        return {"error": f"Erreur lors du test: {str(e)}"}
