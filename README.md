# 🔴 INSA Hub — Portail Étudiant Centralisé (PWA)

Application Web Progressive (PWA) unifiée à destination des étudiants de l'**INSA Lyon**, centralisant les 4 plateformes indispensables du campus dans une interface moderne, réactive et sécurisée :

1. 📅 **Emploi du temps ADE** (`ade-outils.insa-lyon.fr`) : Calendrier des cours, filtres par type (CM/TD/TP/DS), salles, enseignants, calcul des créneaux libres et gestion pérenne d'abonnement iCal.
2. 📊 **Scolarité MonDossierWeb (Apogée)** : Relevés de notes officiels, moyennes de semestres, crédits ECTS acquis, statut de validation des UE et modules.
   - Synchronisation interactive avec défi **MFA TOTP 6 chiffres** (Keycloak).
   - Import direct de fichier ou code source HTML Apogée.
   - **Zéro conservation d'identifiants** : mots de passe et graines MFA ne sont jamais persistés ni logués sur le serveur.
   - Stockage local sécurisé pour consultation permanente hors-ligne.
3. 🍽️ **Restauration Campus** : Menus midi et soir du Restaurant INSA (RI), de la Pizzeria L'Olivier et des RU CROUS La Doua (Puvis de Chavannes, Archimède, Astrée). Indicateur d'affluence en temps réel, filtres diététiques (Végétarien, Porc, Halal, etc.) et points Izly.
4. 🎉 **Vie Associative (Portail VA)** : Calendrier des soirées et événements associatifs, billetteries et annuaire officiel des plus de 130 clubs et associations du campus.

---

## 🏗️ Architecture Technique

```
nifty-archimedes/
├── src/
│   ├── client/                  # Frontend React 18 + Tailwind CSS + PWA
│   │   ├── services/api.service.ts # Client API avec vault chiffré localStorage
│   │   ├── styles/index.css     # Design system & styles INSA Lyon
│   │   ├── App.tsx              # Dashboard unifié (5 onglets réactifs)
│   │   ├── main.tsx             # Point d'entrée React & enregistrement SW
│   │   └── index.html           # Structure HTML5 & viewport PWA
│   ├── server/                  # Backend Express Node.js & Connecteurs
│   │   ├── middleware/          # Logger sans fuite d'identifiants & erreurs HTTP
│   │   ├── routes/              # /api/ade, /api/mdw, /api/dining, /api/va
│   │   ├── services/            # Parsers iCal, Apogée, BDE/CROUS, Portail VA
│   │   ├── utils/               # Sanitisation & algorithme des jours fériés
│   │   └── app.ts               # Configuration Express & serveur statique
│   └── shared/                  # Types TypeScript partagés (client/serveur)
├── public/
│   ├── icons/                   # Icônes PWA (192px, 512px, maskable, SVG)
│   ├── manifest.webmanifest     # Spécification PWA Standalone
│   └── sw.js                    # Service Worker (Cache-first + Network-first)
├── test/
│   ├── unit/                    # 81 tests Vitest (Connecteurs, Sécurité, Modèles)
│   ├── challenger-m23-adversarial.ts # 18 tests d'audit de sécurité & MFA
│   └── challenger-adversarial-m23.ts # 23 tests de stress & robustesse scrapers
└── dist/                        # Compilations de production (client & serveur)
```

---

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** >= 20.0.0
- **npm** >= 10.0.0

### Installation
```bash
npm install
```

### Lancement en Développement
Démarre simultanément le serveur API backend (port 3000) et le serveur Vite (port 5173 avec proxy automatique) :
```bash
npm run dev
```
Ouvrez [http://localhost:5173](http://localhost:5173) dans votre navigateur.

### Compilation pour la Production
Compile le bundle client Vite dans `dist/client/` et le serveur TypeScript dans `dist/server/` :
```bash
npm run build
```

### Lancement du Serveur de Production
```bash
npm start
```
L'application unifiée est alors accessible sur [http://localhost:3000](http://localhost:3000).

---

## ▲ Déploiement sur Vercel

L'application est entièrement configurée pour un déploiement "Zero-Config" sur **Vercel** combinant le frontend PWA (Vite) et l'API Express sous forme de fonctions serverless :

### Méthode 1 : Via Vercel CLI (Ligne de commande)
```bash
# 1. Connexion à votre compte Vercel (si ce n'est pas déjà fait)
npx vercel login

# 2. Déployer en prévisualisation (Preview)
npm run deploy:vercel

# 3. Déployer directement en production (Production URL)
npm run deploy:vercel:prod
```

### Méthode 2 : Via GitHub / Vercel Dashboard
1. Poussez votre dépôt sur GitHub.
2. Rendez-vous sur [vercel.com/new](https://vercel.com/new) et importez votre dépôt.
3. Vercel détecte automatiquement la configuration grâce à `vercel.json` :
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build:client`
   - **Output Directory** : `dist/client`
   - **Serverless API** : Gérée automatiquement via `api/index.ts` et `api/[...path].ts`
4. Cliquez sur **Deploy**.

---

## 🧪 Validation & Tests

Le projet intègre une couverture de tests automatisée exhaustive :

```bash
# 1. Tests unitaires et d'intégration (Vitest)
npm test

# 2. Vérification statique des types TypeScript
npm run typecheck

# 3. Suite adversariale de sécurité et résilience CAS/MFA (18/18 checks)
npx tsx test/challenger-m23-adversarial.ts

# 4. Suite adversariale des scrapers et gestion des fuseaux (23/23 checks)
npx tsx test/challenger-adversarial-m23.ts
```

---

## 🔒 Principes de Sécurité & Confidentialité

- **Zero Credential Retention** : Les mots de passe et codes TOTP ne sont jamais écrits sur disque, ni stockés en base de données, ni journalisés dans les flux de logs (`stdout`/`stderr`).
- **Sanitisation d'URL** : Les paramètres sensibles dans les requêtes (`password`, `token`, `totp`, etc.) sont systématiquement masqués sous la mention `[REDACTED]` dans les traces et réponses d'erreur.
- **Limitation de charge** : Taille maximale de payload limitée à 1 Mo pour parer les attaques par déni de service (DDoS / Memory Exhaustion).
- **Consommation unique de session** : Tout jeton de défi MFA est invalidé après utilisation ou après 120 secondes d'inactivité.
- **Protection XSS** : Nettoyage systématique des balises HTML et scripts injectés dans les extractions de notes et d'événements.

---

## 📱 PWA & Mode Hors-ligne

- **Service Worker (`sw.js`)** :
  - Mise en cache des ressources statiques (HTML, CSS, JS, icônes) via stratégie *Cache-First*.
  - Mise en cache intelligente des réponses d'API avec stratégie *Network-First* et bascule hors-ligne transparente.
- **Coffre-fort local client** : Les notes MonDossierWeb et l'URL d'abonnement ADE sont stockées localement dans le navigateur pour garantir une consultation complète même sans connexion réseau.
- **Installable** : Compatible iOS (Safari > "Sur l'écran d'accueil") et Android (Chrome > "Installer l'application").
