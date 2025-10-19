# 🍔 UberTek - Bot Discord pour EPITECH Marseille

Bot Discord de gestion de commandes de nourriture et boissons pour le BDE d'EPITECH Marseille.

## 🎯 Fonctionnalités

### Pour les étudiants
- 🛒 Passer des commandes via `/commander`
- 📦 Suivre ses commandes avec `/delivery`
- 💬 Communication directe avec les livreurs
- 🎁 Bénéficier des promotions automatiques

### Pour le BDE
- 📋 Gérer le menu avec `/product`
- 📊 Voir les statistiques avec `/stats`
- 🚴 Gérer les livraisons
- 🎁 Créer des promotions avec `/promo`
- 📦 Voir les commandes en attente avec `/courses`

## 🚀 Installation

### Prérequis
- Node.js 18+
- Docker & Docker Compose
- Un bot Discord configuré

### Configuration

1. **Cloner le projet**
```bash
git clone https://github.com/Ivy-js/UberTek
cd UberTek
```

2. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditez `.env` et remplissez :
```env
DISCORD_TOKEN=votre_token_discord
CLIENT_ID=votre_client_id
GUILD_ID=id_de_votre_serveur
ORDERS_CHANNEL_ID=id_du_salon_commandes
BDE_ROLE_ID=id_du_role_bde
STUDENT_ROLE_ID=id_du_role_etudiant
```

3. **Créer le bot Discord**
- Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
- Créez une nouvelle application
- Dans "Bot", activez tous les Privileged Gateway Intents
- Copiez le token
- Dans "OAuth2 > URL Generator" :
  - Scopes: `bot`, `applications.commands`
  - Permissions: Administrator (ou personnalisées)
  - Utilisez l'URL générée pour inviter le bot

4. **Configurer les rôles Discord**
- Créez un rôle `BDE` pour les membres du BDE
- Créez un rôle `Student` pour les étudiants
- Créez un salon `#orders` pour les commandes

### Démarrage avec Docker

```bash
# Construire et démarrer les conteneurs
docker-compose up -d

# Voir les logs
docker-compose logs -f ubertek-bot

# Déployer les commandes slash
docker-compose exec ubertek-bot npm run deploy
```

### Démarrage sans Docker (développement)

```bash
# Installer les dépendances
npm install

# Démarrer PostgreSQL localement avec le script fourni
./setup-db.sh

# Configurer DB_HOST=localhost dans .env

# Déployer les commandes
npm run deploy

# Démarrer le bot
npm start

# Ou en mode watch (auto-reload)
npm run dev
```

## 🎬 Configuration initiale

**⚠️ IMPORTANT** : La base de données est vide par défaut. Avant que les étudiants puissent commander, le BDE doit :

1. **Ajouter des produits** avec `/product add`
2. **Créer des promotions** (optionnel) avec `/promo add`

Consultez le fichier [SETUP_GUIDE.md](SETUP_GUIDE.md) pour un guide détaillé.

### Scripts utiles

```bash
./setup-db.sh    # Démarrer la base de données
./start-db.sh    # Redémarrer la base existante
./stop-db.sh     # Arrêter la base
./logs-db.sh     # Voir les logs PostgreSQL
./reset-db.sh    # ⚠️ RÉINITIALISER toutes les données
```

## 📋 Commandes disponibles

### Commandes utilisateur

| Commande | Description |
|----------|-------------|
| `/commander` | Passer une nouvelle commande |
| `/delivery [numéro]` | Suivre l'état d'une commande |

### Commandes BDE

| Commande | Description |
|----------|-------------|
| `/product add` | Ajouter un produit au menu |
| `/product edit` | Modifier le prix d'un produit |
| `/product stock` | Gérer la disponibilité |
| `/product list` | Lister tous les produits |
| `/courses` | Voir les commandes en attente |
| `/stats` | Voir les statistiques de vente |
| `/promo add` | Créer une promotion |
| `/promo list` | Lister les promotions |
| `/promo toggle` | Activer/désactiver une promo |

## 🛠️ Structure du projet

```
UberTek/
├── src/
│   ├── commands/          # Commandes slash
│   │   ├── bde/          # Commandes BDE
│   │   └── user/         # Commandes utilisateurs
│   ├── events/           # Événements Discord
│   ├── handlers/         # Gestionnaires d'interactions
│   ├── database/         # Gestion base de données
│   ├── utils/            # Fonctions utilitaires
│   ├── index.js          # Point d'entrée
│   └── deploy-commands.js
├── database/
│   └── schema.sql        # Schéma PostgreSQL
├── docker-compose.yml
├── Dockerfile
├── package.json
└── .env.example
```

## 🗄️ Base de données

### Tables principales

- **products** : Catalogue des produits
- **orders** : Historique des commandes
- **promotions** : Système de promotions

Le schéma est automatiquement créé au premier lancement grâce à Docker.

## 🔄 Workflow de commande

1. **Étudiant** : `/commander` → Reçoit un DM
2. **Sélection** : Catégories → Produits → Validation
3. **Infos** : Heure de livraison + Salle
4. **Confirmation** : Commande envoyée au salon `#orders`
5. **BDE** : Prend en charge la commande
6. **Livraison** : Suivi en temps réel
7. **Finalisation** : Client confirme la réception

## 🎁 Système de promotions

Les promotions sont appliquées automatiquement lors de la validation de commande.

Exemple :
```
Condition : "2 Red Bull"
Récompense : "-50% sur le 3ème"
```

## 🐛 Dépannage

### Le bot ne répond pas
- Vérifiez que le bot est en ligne
- Vérifiez les logs : `docker-compose logs -f`
- Redéployez les commandes : `npm run deploy`

### Erreur de base de données
- Vérifiez que PostgreSQL est démarré
- Vérifiez les credentials dans `.env`
- Recréez le conteneur : `docker-compose down -v && docker-compose up -d`

### Les DM ne fonctionnent pas
- L'utilisateur doit autoriser les MP du serveur
- Paramètres → Confidentialité → Autoriser les messages privés

## 📝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT License - voir le fichier LICENSE

## 🙏 Remerciements

Développé pour le BDE d'EPITECH Marseille 🎓

---

**Note** : Projet MVP - Des améliorations sont prévues (paiements, dashboard web, système de fidélité, etc.)
