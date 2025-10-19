#!/bin/bash

# Script pour arrêter la base de données UberTek
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Arrêt de la base de données UberTek...${NC}"

sudo docker stop ubertek-db

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Base de données arrêtée${NC}"
else
    echo -e "${RED}❌ Erreur lors de l'arrêt${NC}"
fi
