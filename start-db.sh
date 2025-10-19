#!/bin/bash

# Script pour démarrer la base de données UberTek
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Démarrage de la base de données UberTek...${NC}"

sudo docker start ubertek-db

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Base de données démarrée${NC}"
    echo -e "\n${GREEN}📊 Connexion :${NC}"
    echo -e "  Host: localhost:5432"
    echo -e "  Database: ubertek"
    echo -e "  User: ubertek"
    echo -e "  Password: securepass"
else
    echo -e "${RED}❌ Erreur lors du démarrage${NC}"
    echo -e "${YELLOW}💡 Essayez de lancer ./setup-db.sh pour créer la base${NC}"
fi
