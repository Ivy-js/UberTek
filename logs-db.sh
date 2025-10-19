#!/bin/bash

# Script pour voir les logs de la base de données
echo "📋 Logs de PostgreSQL (Ctrl+C pour quitter):"
echo ""
sudo docker logs -f ubertek-db
