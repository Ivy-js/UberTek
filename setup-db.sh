#!/bin/bash

# Script de déploiement de la base de données UberTek
# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 UberTek - Déploiement de la base de données${NC}\n"

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

# Arrêter et supprimer l'ancien conteneur s'il existe
echo -e "${YELLOW}🔄 Nettoyage des anciens conteneurs...${NC}"
sudo docker stop ubertek-db 2>/dev/null
sudo docker rm ubertek-db 2>/dev/null

# Créer le volume si nécessaire
echo -e "${YELLOW}📦 Création du volume pour les données...${NC}"
sudo docker volume create ubertek_db_data

# Lancer PostgreSQL
echo -e "${YELLOW}🐘 Démarrage de PostgreSQL...${NC}"
sudo docker run -d \
  --name ubertek-db \
  -e POSTGRES_USER=ubertek \
  -e POSTGRES_PASSWORD=securepass \
  -e POSTGRES_DB=ubertek \
  -p 5432:5432 \
  -v "$(pwd)/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql" \
  -v ubertek_db_data:/var/lib/postgresql/data \
  --health-cmd='pg_isready -U ubertek' \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=5 \
  postgres:16-alpine

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ PostgreSQL démarré avec succès !${NC}"
    echo -e "\n${GREEN}📊 Informations de connexion :${NC}"
    echo -e "  Host: ${YELLOW}localhost${NC}"
    echo -e "  Port: ${YELLOW}5432${NC}"
    echo -e "  Database: ${YELLOW}ubertek${NC}"
    echo -e "  User: ${YELLOW}ubertek${NC}"
    echo -e "  Password: ${YELLOW}securepass${NC}"
    
    echo -e "\n${YELLOW}⏳ Attente du démarrage complet (10 secondes)...${NC}"
    sleep 10
    
    # Vérifier l'état
    echo -e "\n${YELLOW}🔍 Vérification de l'état...${NC}"
    sudo docker ps --filter name=ubertek-db --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo -e "\n${GREEN}✅ Base de données prête !${NC}"
    echo -e "\n${GREEN}📝 Commandes utiles :${NC}"
    echo -e "  • Voir les logs: ${YELLOW}sudo docker logs ubertek-db${NC}"
    echo -e "  • Arrêter la DB: ${YELLOW}sudo docker stop ubertek-db${NC}"
    echo -e "  • Démarrer la DB: ${YELLOW}sudo docker start ubertek-db${NC}"
    echo -e "  • Se connecter: ${YELLOW}sudo docker exec -it ubertek-db psql -U ubertek -d ubertek${NC}"
    echo -e "  • Supprimer tout: ${YELLOW}sudo docker stop ubertek-db && sudo docker rm ubertek-db && sudo docker volume rm ubertek_db_data${NC}"
else
    echo -e "\n${RED}❌ Erreur lors du démarrage de PostgreSQL${NC}"
    exit 1
fi
