#!/bin/bash

# Script de démarrage rapide pour ARP
# Usage: ./start.sh [dev|prod]

set -e

echo "🚀 Démarrage d'ARP - Project Management Platform"
echo "=================================================="

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker d'abord."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose d'abord."
    exit 1
fi

# Déterminer le mode (dev par défaut)
MODE=${1:-dev}

if [ "$MODE" = "prod" ]; then
    echo "🏭 Mode: Production"
    COMPOSE_FILE="docker-compose.prod.yml"
    
    # Vérifier si le fichier .env existe
    if [ ! -f .env ]; then
        echo "❌ Le fichier .env n'existe pas. Création d'un fichier d'exemple..."
        cat > .env << EOF
POSTGRES_PASSWORD=arp_secure_password_123
SECRET_KEY=arp_very_secure_secret_key_change_in_production_123456789
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF
        echo "✅ Fichier .env créé avec des valeurs par défaut"
        echo "⚠️  Veuillez modifier le fichier .env avec vos propres valeurs sécurisées"
    fi
else
    echo "🔧 Mode: Développement"
    COMPOSE_FILE="docker-compose.yml"
    
    # Créer le fichier .env pour le backend si il n'existe pas
    if [ ! -f back/.env ]; then
        echo "📝 Création du fichier .env pour le backend..."
        cp back/env.example back/.env
        echo "✅ Fichier .env créé pour le backend"
    fi
fi

echo ""
echo "🐳 Construction et démarrage des conteneurs Docker..."

# Construire et démarrer les services
docker-compose -f $COMPOSE_FILE up -d --build

echo ""
echo "⏳ Attente du démarrage des services..."

# Attendre que PostgreSQL soit prêt
echo "🗄️  Attente de PostgreSQL..."
sleep 10

# Initialiser la base de données si en mode dev
if [ "$MODE" = "dev" ]; then
    echo "🗄️  Initialisation de la base de données..."
    docker-compose -f $COMPOSE_FILE exec backend python scripts/init_db.py
fi

echo ""
echo "✅ ARP est maintenant démarré!"
echo ""
echo "🌐 Accès aux services:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:8000"
echo "   API Docs:     http://localhost:8000/docs"
echo "   pgAdmin:      http://localhost:5050"
echo ""

if [ "$MODE" = "dev" ]; then
    echo "🔑 Identifiants de connexion par défaut:"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo ""
fi

echo "📊 Pour voir les logs:"
echo "   docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🛑 Pour arrêter:"
echo "   docker-compose -f $COMPOSE_FILE down"
echo ""
echo "🎉 Bon développement!" 