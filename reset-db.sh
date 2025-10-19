#!/bin/bash

# Script pour réinitialiser complètement la base de données
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}⚠️  ATTENTION - Réinitialisation de la base de données${NC}"
echo -e "${YELLOW}Cela va supprimer TOUTES les données (produits, commandes, promotions)${NC}"
echo ""
read -p "Êtes-vous sûr ? (tapez 'oui' pour confirmer) : " confirm

if [ "$confirm" != "oui" ]; then
    echo -e "${GREEN}✅ Annulé${NC}"
    exit 0
fi

echo -e "\n${YELLOW}🗑️  Suppression des données...${NC}"
sudo docker exec -it ubertek-db psql -U ubertek -d ubertek -c "DELETE FROM orders; DELETE FROM products; DELETE FROM promotions;"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Base de données réinitialisée !${NC}"
    echo -e "\n${YELLOW}💡 Utilisez /product add pour ajouter des articles${NC}"
    
    # Afficher les comptes
    echo -e "\n${GREEN}📊 État actuel :${NC}"
    sudo docker exec -it ubertek-db psql -U ubertek -d ubertek -c "
        SELECT 
            (SELECT COUNT(*) FROM products) as produits,
            (SELECT COUNT(*) FROM orders) as commandes,
            (SELECT COUNT(*) FROM promotions) as promotions;
    "
else
    echo -e "\n${RED}❌ Erreur lors de la réinitialisation${NC}"
    exit 1
fi
