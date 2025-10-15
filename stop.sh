#!/bin/bash

# Script d'arrêt d'ARP
# Usage: ./stop.sh

echo "🛑 Arrêt d'ARP - Project Management Platform"
echo "=============================================="

# Arrêter les services Docker
echo "🐳 Arrêt des services Docker..."
docker-compose down

# Tuer DBeaver s'il tourne
echo "🦫 Arrêt de DBeaver..."
pkill -f dbeaver 2>/dev/null || echo "DBeaver n'était pas en cours d'exécution"

echo ""
echo "✅ Tous les services ont été arrêtés!"
echo ""
echo "📊 Pour redémarrer:"
echo "   ./launch.sh"
echo "" 