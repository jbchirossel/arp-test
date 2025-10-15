#!/usr/bin/env python3
"""
Script d'initialisation de la base de données
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app import models, crud, schemas

def init_db():
    """Initialise la base de données avec les tables"""
    db = SessionLocal()
    
    try:
        # Créer les tables
        models.Base.metadata.create_all(bind=engine)
        print("✅ Tables créées avec succès!")
        
        # Créer un utilisateur admin par défaut
        test_user = crud.get_user_by_username(db, "admin")
        if not test_user:
            user_data = schemas.UserCreate(
                email="admin@example.com",
                username="admin",
                password="admin123",
                first_name="Admin",
                last_name="User"
            )
            test_user = crud.create_user(db=db, user=user_data)
            print(f"✅ Utilisateur admin créé: {test_user.username}")
        
        print("\n🎉 Base de données initialisée avec succès!")
        print("\n📋 Identifiants par défaut:")
        print("   Username: admin")
        print("   Password: admin123")
        print("   Email: admin@example.com")
        
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 