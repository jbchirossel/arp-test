#!/bin/bash

# Script de lancement ARP avec DBeaver
# Usage: ./launch.sh

set -e

echo "🚀 Lancement d'ARP avec DBeaver"
echo "=================================="

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker d'abord."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose d'abord."
    exit 1
fi

# Vérifier si DBeaver est installé
if ! command -v dbeaver &> /dev/null; then
    echo "⚠️  DBeaver n'est pas installé ou n'est pas dans le PATH."
    echo "   Veuillez installer DBeaver depuis: https://dbeaver.io/download/"
    echo "   Ou lancer manuellement après le démarrage des services."
fi

# Créer le fichier .env pour le backend si il n'existe pas
if [ ! -f back/.env ]; then
    echo "📝 Création du fichier .env pour le backend..."
    cat > back/.env << EOF
# Database
DATABASE_URL=postgresql://arp_user:arp_password@localhost:5432/arp_db

# Security
SECRET_KEY=arp-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API
API_V1_STR=/api/v1
PROJECT_NAME=ARP Backend

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:3001"]
EOF
    echo "✅ Fichier .env créé pour le backend"
fi

echo ""
echo "🐳 Démarrage des services Docker..."

# Arrêter les services existants s'ils tournent
docker-compose down 2>/dev/null || true

# Construire et démarrer les services
docker-compose up -d --build

echo ""
echo "⏳ Attente du démarrage des services..."

# Attendre que PostgreSQL soit prêt
echo "🗄️  Attente de PostgreSQL..."
sleep 15

# Initialiser la base de données avec les nouveaux identifiants
echo "🗄️  Initialisation de la base de données..."
docker-compose exec backend python scripts/init_db.py

echo ""
echo "✅ Services démarrés avec succès!"
echo ""

# Ouvrir le frontend dans le navigateur
echo "🌐 Ouverture du frontend dans le navigateur..."
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:3000
elif command -v start &> /dev/null; then
    # Windows
    start http://localhost:3000
else
    echo "⚠️  Impossible d'ouvrir automatiquement le navigateur"
fi

# Ouvrir le backend API docs dans le navigateur
echo "📚 Ouverture de la documentation API..."
sleep 2
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:8000/docs
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:8000/docs
elif command -v start &> /dev/null; then
    # Windows
    start http://localhost:8000/docs
else
    echo "⚠️  Impossible d'ouvrir automatiquement le navigateur"
fi

# Lancer DBeaver si disponible
if command -v dbeaver &> /dev/null; then
    echo "🦫 Lancement de DBeaver..."
    
    # Créer un fichier de configuration temporaire pour DBeaver
    cat > /tmp/arp-dbeaver-connection.json << EOF
{
  "connection": {
          "name": "ARP PostgreSQL",
    "driver": "postgresql",
    "host": "localhost",
    "port": 5432,
          "database": "arp_db",
      "username": "arp_user",
      "password": "arp_password",
      "url": "jdbc:postgresql://localhost:5432/arp_db"
  },
  "settings": {
    "autoCommit": true,
    "readOnly": false,
    "defaultSchema": "public"
  },
        "description": "Connexion à la base de données ARP"
}
EOF

    # Lancer DBeaver en arrière-plan
    dbeaver &
    echo "✅ DBeaver lancé en arrière-plan"
else
    echo "⚠️  DBeaver n'est pas installé. Veuillez l'installer manuellement."
    echo "   Téléchargement: https://dbeaver.io/download/"
fi

echo ""
echo "🌐 Accès aux services:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:8000"
echo "   API Docs:     http://localhost:8000/docs"
echo "   pgAdmin:      http://localhost:5050"
echo ""

echo "🔑 Identifiants de connexion:"
echo "   Username: admin"
echo "   Password: jibvy6-nivkyv-mewcAv"
echo ""

echo "🗄️  Configuration DBeaver:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: arp_db"
echo "   Username: arp_user"
echo "   Password: arp_password"
echo ""

echo "📊 Commandes utiles:"
echo "   Voir les logs:     docker-compose logs -f"
echo "   Arrêter:          docker-compose down"
echo "   Redémarrer:       ./launch.sh"
echo ""

echo "🎉 Tout est prêt! Bon développement!" 