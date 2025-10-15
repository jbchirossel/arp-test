# ARP - Project Management Platform

Une application moderne de gestion de projets avec Next.js, FastAPI, PostgreSQL et Docker.

## 🚀 Technologies Utilisées

### Backend
- **FastAPI** - Framework web moderne et rapide pour Python
- **SQLAlchemy** - ORM pour la gestion de la base de données
- **Alembic** - Gestion des migrations de base de données
- **PostgreSQL** - Base de données relationnelle
- **JWT** - Authentification sécurisée

### Frontend
- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **React Query** - Gestion d'état et cache
- **Lucide React** - Icônes modernes

### Infrastructure
- **Docker** - Conteneurisation
- **Docker Compose** - Orchestration des services
- **Nginx** - Reverse proxy (production)
- **DBeaver** - Client de base de données

## 📁 Structure du Projet

```
aïerp/
├── back/                    # Backend FastAPI
│   ├── app/
│   │   ├── api/            # Endpoints API
│   │   ├── models.py       # Modèles SQLAlchemy
│   │   ├── schemas.py      # Schémas Pydantic
│   │   ├── crud.py         # Opérations CRUD
│   │   ├── auth.py         # Authentification
│   │   ├── config.py       # Configuration
│   │   └── database.py     # Configuration DB
│   ├── alembic/            # Migrations Alembic
│   ├── requirements.txt    # Dépendances Python
│   ├── Dockerfile          # Image Docker backend
│   └── main.py             # Point d'entrée FastAPI
├── front/                   # Frontend Next.js
│   ├── app/                # Pages et composants
│   ├── package.json        # Dépendances Node.js
│   ├── Dockerfile          # Image Docker frontend
│   └── tailwind.config.js  # Configuration Tailwind
├── docker-compose.yml      # Orchestration développement
├── docker-compose.prod.yml # Orchestration production
├── nginx.conf              # Configuration Nginx
└── README.md               # Documentation
```

## 🛠️ Installation et Démarrage

### Prérequis
- Docker et Docker Compose
- Node.js 18+ (pour le développement local)
- Python 3.11+ (pour le développement local)

### 1. Cloner le projet
```bash
git clone <repository-url>
cd aïerp
```

### 2. Configuration des variables d'environnement

#### Développement
```bash
# Copier le fichier d'exemple
cp back/env.example back/.env

# Éditer les variables selon vos besoins
nano back/.env
```

#### Production
```bash
# Créer un fichier .env à la racine
cat > .env << EOF
POSTGRES_PASSWORD=your_secure_password
SECRET_KEY=your_very_secure_secret_key
BACKEND_CORS_ORIGINS=["https://yourdomain.com"]
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
EOF
```

### 3. Démarrage avec Docker Compose

#### Démarrage rapide avec DBeaver
```bash
# Lancer tous les services + DBeaver
./launch.sh

# Voir les logs
./logs.sh

# Arrêter tous les services
./stop.sh
```

#### Démarrage manuel
```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

#### Production
```bash
# Démarrer en mode production
docker-compose -f docker-compose.prod.yml up -d

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Accès aux services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentation API**: http://localhost:8000/docs
- **pgAdmin**: http://localhost:5050
  - Email: admin@arp.com
  - Mot de passe: admin
- **DBeaver**: Lancé automatiquement avec le script `./launch.sh`

## 🗄️ Base de Données

### Connexion avec DBeaver

Le script `./launch.sh` lance automatiquement DBeaver avec la configuration appropriée.

**Configuration manuelle :**
1. Ouvrir DBeaver
2. Créer une nouvelle connexion PostgreSQL
3. Configuration :
   - Host: localhost
   - Port: 5432
   - Database: arp_db
- Username: arp_user
- Password: arp_password

### Migrations Alembic

```bash
# Se connecter au container backend
docker-compose exec backend bash

# Créer une nouvelle migration
alembic revision --autogenerate -m "Description de la migration"

# Appliquer les migrations
alembic upgrade head

# Voir l'historique des migrations
alembic history
```

## 🔧 Développement Local

### Backend

```bash
cd back

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install -r requirements.txt

# Démarrer le serveur de développement
uvicorn main:app --reload
```

### Frontend

```bash
cd front

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

## 📚 API Endpoints

### Authentification
- `POST /api/v1/auth/token` - Connexion
- `POST /api/v1/auth/register` - Inscription
- `GET /api/v1/auth/me` - Profil utilisateur

### Projets
- `GET /api/v1/projects/` - Liste des projets
- `POST /api/v1/projects/` - Créer un projet
- `GET /api/v1/projects/{id}` - Détails d'un projet
- `PUT /api/v1/projects/{id}` - Modifier un projet
- `DELETE /api/v1/projects/{id}` - Supprimer un projet

### Tâches
- `GET /api/v1/tasks/` - Liste des tâches
- `POST /api/v1/tasks/` - Créer une tâche
- `GET /api/v1/tasks/{id}` - Détails d'une tâche
- `PUT /api/v1/tasks/{id}` - Modifier une tâche
- `DELETE /api/v1/tasks/{id}` - Supprimer une tâche

## 🔒 Sécurité

- Authentification JWT
- Hachage des mots de passe avec bcrypt
- CORS configuré
- Validation des données avec Pydantic
- Permissions basées sur les utilisateurs

## 🚀 Déploiement

### Production avec Docker

```bash
# Construire et démarrer en production
docker-compose -f docker-compose.prod.yml up -d --build

# Vérifier les services
docker-compose -f docker-compose.prod.yml ps

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Variables d'environnement de production

Assurez-vous de configurer ces variables dans votre fichier `.env` :

```bash
POSTGRES_PASSWORD=your_very_secure_password
SECRET_KEY=your_very_long_and_secure_secret_key
BACKEND_CORS_ORIGINS=["https://yourdomain.com"]
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

## 🧪 Tests

```bash
# Tests backend
cd back
pytest

# Tests frontend
cd front
npm test
```

## 📝 Scripts Utiles

```bash
# Redémarrer un service spécifique
docker-compose restart backend

# Voir les logs d'un service
docker-compose logs backend

# Se connecter à un container
docker-compose exec backend bash
docker-compose exec postgres psql -U arp_user -d arp_db

# Sauvegarder la base de données
docker-compose exec postgres pg_dump -U arp_user arp_db > backup.sql

# Restaurer la base de données
docker-compose exec -T postgres psql -U arp_user -d arp_db < backup.sql
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation API à http://localhost:8000/docs
- Vérifier les logs Docker : `docker-compose logs` 