🎟️ Event-Go-BJ

Event-Go-BJ est une plateforme numérique innovante pensée pour révolutionner la gestion et l’organisation d’événements au Bénin.
Elle offre une expérience simple, fluide et sécurisée aussi bien pour les participants que pour les organisateurs, tout en donnant aux administrateurs une vision complète des activités de la plateforme.

Avec Event-Go-BJ, chaque acteur trouve sa place :

👉 Participants : découvrent les événements, achètent leurs billets en ligne, reçoivent un QR Code sécurisé et profitent d’une expérience sans file d’attente.

👉 Organisateurs : créent et gèrent leurs événements, suivent en temps réel la vente des billets, et accèdent à des statistiques détaillées pour améliorer leur stratégie.

👉 Administrateurs : supervisent l’ensemble du système grâce à un tableau de bord puissant qui centralise les données clés (utilisateurs, revenus, événements).

En combinant modernité, accessibilité et performance, Event-Go-BJ ambitionne de devenir la référence de la billetterie et de la gestion d’événements digitaux au Bénin.
Une application React moderne pour la gestion d'événements au Bénin avec billetterie intégrée.

## 🚀 Technologies utilisées

- **React 18** avec TypeScript
- **Vite** - Build tool rapide
- **TailwindCSS** - Framework CSS utilitaire
- **React Router** - Navigation côté client
- **Axios** - Client HTTP pour les appels API
- **Lucide React** - Icônes modernes
- **QRCode** - Génération de codes QR pour les billets

## 📋 Prérequis

- Node.js (version 16 ou supérieure)
- npm ou yarn
- Backend EventGo BJ en cours d'exécution sur `http://localhost:8000`

## 🛠️ Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd eventgo-bj-frontend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
Créer un fichier `.env` à la racine du projet :
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

4. **Lancer l'application**
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## 📁 Structure du projet

```
src/
├── components/           # Composants réutilisables
│   ├── ui/              # Composants UI de base
│   ├── Navbar.tsx       # Barre de navigation
│   ├── EventCard.tsx    # Carte d'événement
│   ├── QRCodeDisplay.tsx # Affichage QR Code
│   └── ...
├── hooks/               # Hooks personnalisés
│   └── useAuth.tsx      # Gestion de l'authentification
├── pages/               # Pages de l'application
│   ├── LandingPage.tsx  # Page d'accueil
│   ├── HomePage.tsx     # Page principale
│   ├── LoginPage.tsx    # Connexion
│   ├── RegisterPage.tsx # Inscription
│   ├── EventsPage.tsx   # Liste des événements
│   └── ...
├── services/            # Services API
│   ├── apiClient.ts     # Configuration Axios
│   └── endpoints.ts     # Endpoints API
└── App.tsx              # Composant racine
```

## 🔐 Authentification

L'application utilise JWT pour l'authentification avec refresh token automatique. Les tokens sont stockés dans le localStorage.

## 🎯 Fonctionnalités

### Pages publiques
- **Landing Page** - Présentation de la plateforme
- **Liste des événements** - Parcourir et rechercher des événements
- **Détail d'un événement** - Informations complètes et achat de billets

### Espaces utilisateurs
- **Profil utilisateur** - Gestion des informations personnelles
- **Tableau de bord organisateur** - Création et gestion d'événements
- **Tableau de bord administrateur** - Statistiques globales

### Fonctionnalités avancées
- Recherche et filtrage d'événements
- Billetterie avec codes QR
- Paiements mobile money et carte
- Interface responsive (mobile/desktop)
- Authentification sécurisée

## 🎨 Design

L'application utilise TailwindCSS avec :
- Palette de couleurs cohérente (primary blue, accent orange)
- Animations CSS pour les interactions
- Design responsive first
- Composants UI réutilisables
- Dark mode ready (classes Tailwind préparées)

## 🔧 Scripts disponibles

- `npm run dev` - Démarre le serveur de développement
- `npm run build` - Construit l'application pour la production
- `npm run preview` - Prévisualise la version de production
- `npm run lint` - Vérifie la qualité du code

## 📦 API Integration

L'application consomme les endpoints définis dans `openapi.yaml` :

### Endpoints principaux
- `POST /auth/login/` - Connexion utilisateur
- `POST /auth/register/` - Inscription utilisateur
- `GET /events/` - Liste des événements
- `POST /events/` - Création d'événement
- `POST /tickets/{id}/purchase/` - Achat de billet
- `GET /dashboard/organizer/` - Stats organisateur
- `GET /dashboard/admin/` - Stats administrateur

## 🚀 Déploiement

### Build de production
```bash
npm run build
```

Le dossier `dist` contient les fichiers optimisés pour la production.

### Variables d'environnement pour production
```env
VITE_API_BASE_URL=https://api.eventgo.bj/api
```

## 🐛 Dépannage

### Problème de CORS
Si vous rencontrez des erreurs CORS, vérifiez que le backend autorise les requêtes depuis `http://localhost:3000`.

### Problème de tokens
Les tokens JWT sont stockés dans localStorage. En cas de problème :
1. Ouvrir les DevTools (F12)
2. Aller dans Application > Local Storage
3. Supprimer les clés `accessToken`, `refreshToken`, `user`

### Erreur de build
```bash
# Nettoyer le cache
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajouter nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Email : support@eventgo.bj
- Documentation : [docs.eventgo.bj](https://docs.eventgo.bj)

---

**EventGo BJ** - Votre plateforme de référence pour les événements au Bénin 🇧🇯
