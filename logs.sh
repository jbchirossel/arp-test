#!/bin/bash

# Script pour voir les logs d'ARP
# Usage: ./logs.sh [service]

echo "📊 Logs d'ARP - Project Management Platform"
echo "============================================="

if [ -z "$1" ]; then
    echo "📋 Affichage des logs de tous les services..."
    echo "   Pour voir les logs d'un service spécifique: ./logs.sh [backend|frontend|postgres|pgadmin]"
    echo ""
    docker-compose logs -f
else
    echo "📋 Affichage des logs du service: $1"
    echo ""
    docker-compose logs -f $1
fi 