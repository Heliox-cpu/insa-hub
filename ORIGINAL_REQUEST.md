# Original User Request

## Initial Request — 2026-09-29T10:56:49Z

Une application web progressive (PWA / Webapp) unifiée pour les étudiants de l'INSA Lyon centralisant les emplois du temps ADE, le suivi des notes MonDossierWeb (Apogée via CAS Keycloak + challenge MFA TOTP), les menus des restaurants universitaires (RI, L'Olivier, CROUS) et le calendrier des événements de la vie associative (Portail VA). L'application doit adopter une architecture Fullstack TypeScript avec interface responsive PWA (Tailwind CSS) et synchronisation interactive à la demande.

Working directory: /Users/willy/Documents/antigravity/nifty-archimedes
Integrity mode: development

## Contexte technique des services du campus (Rétro-ingénierie)
- **Emploi du temps ADE** : L'accès au flux d'abonnement s'effectue via l'URL d'export `https://ade-outils.insa-lyon.fr/ADE-Cal:~<LOGIN>!<ANNEE>:<TOKEN_SECRET>`. Une fois cette URL configurée une première fois par l'étudiant, elle est pérenne et ne nécessite aucun login CAS ni MFA pour les rafraîchissements suivants. Les intitulés des événements suivent le format `<Dept>:<Année>:<Sem>::<CodeMatière>:<Type>::<Groupe> #<Numéro>` (ex: `IF:3:S1::BDR:CM::3IF3 #001`). Utiliser `node-ical` pour le parsing.
- **Menus Restauration** : Endpoint JSON public opérationnel `https://utils.bde-insa-lyon.fr/menu/data/menu.json` (fournit les menus midi/soir du RI et de L'Olivier avec labels et allergènes) + API publique `api.croustillant.menu` pour les RU CROUS de la Doua (Puvis de Chavannes, Archimède, Astrée). Aucun login ni VPN requis.
- **Portail VA** : API REST publique Django sur `https://portail.asso-insa-lyon.fr/api/v1/events/` (filtre par date, types, assos, billetterie) et `/api/v1/directory/` (annuaire associatif). Accès public direct (nécessite une passerelle serveur pour contourner les limitations CORS).
- **MonDossierWeb** : Portail Apogée sous CAS Keycloak (`idauth.insa-lyon.fr/realms/insa-lyon/protocol/cas/login`) protégé par double facteur TOTP (6 chiffres). Hors campus, le service requiert le VPN INSA (`sslvpn.cisr.fr`) ou une session établie depuis le réseau du campus (Eduroam / résidences). Les notes doivent être mises en cache localement pour une consultation permanente hors-ligne.

## Requirements

### R1. Connecteurs de données & Scrapers modulaires
- **Connecteur Restos** : Récupérer et structurer les repas du midi et du soir pour le Restaurant INSA (lignes traditionnelle, monde, végétarienne), la pizzeria L'Olivier et le CROUS Einstein/Puvis, avec indicateur d'affluence et filtre diététique.
- **Connecteur Portail VA** : Consommer l'API REST de la vie associative via un proxy serveur pour restituer les événements associatifs hebdomadaires et l'annuaire des clubs avec métadonnées complètes.
- **Connecteur ADE Planning** : Télécharger et parser les flux iCal/ICS en objets cours typés (matière, type CM/TD/TP, horaires, salle, enseignant) via `node-ical` avec découpage regex du `SUMMARY`, détection des créneaux libres et gestion du cache.
- **Connecteur MonDossierWeb** : Fournir un module d'authentification automatisée pilotant le formulaire CAS Keycloak et acceptant le code de challenge MFA TOTP en temps réel, extrayant les relevés de notes, moyennes, semestres et crédits ECTS depuis les pages HTML Apogée.

### R2. Gestion de Session & Sécurité de l'Authentification CAS/MFA
- L'authentification CAS + MFA s'effectue interactivement à la demande : l'utilisateur déclenche la synchronisation en saisissant son code TOTP.
- Mise en cache chiffré des données de scolarité dans le stockage local du navigateur (IndexedDB / Web Storage) pour permettre la consultation instantanée hors-ligne sans redemander le mot de passe ni le MFA à chaque ouverture.
- Aucune donnée d'identification (mot de passe INSA ou graine TOTP) ne doit être transmise ou conservée sur un serveur tiers distant.

### R3. Application Web & Expérience Utilisateur PWA
- Interface utilisateur responsive optimisée pour smartphone et desktop, basée sur Tailwind CSS et un design soigné respectant l'identité visuelle de l'INSA Lyon.
- Tableau de bord principal avec vue synthétique de la journée : prochains cours ADE, menu du midi sélectionné, dernière note enregistrée et événements campus du soir.
- Vues dédiées avec filtres : Calendrier hebdomadaire ADE, Bulletin de notes par semestre MonDossierWeb, Menus des différents points de restauration, et Flux Vie Associative.
- Mode PWA avec support hors-ligne (Service Worker) et bascule de thèmes (sombre / clair).

## Acceptance Criteria

### Vérification programmatique des Connecteurs
- [ ] Le connecteur Menus extrait avec succès les plats, accompagnements et desserts du flux JSON de test et gère les cas de restaurants fermés (dimanches et jours fériés).
- [ ] Le parser ADE transforme un flux iCal de référence en une liste structurée d'événements avec gestion rigoureuse des fuseaux horaires (Europe/Paris).
- [ ] Le connecteur Portail VA retourne une liste typée d'événements avec dates valides, noms d'assos et descriptions sanitaires sans erreur CORS.
- [ ] Le connecteur MonDossierWeb dispose d'une suite de tests avec fixtures HTML simulant le portail Apogée et validant l'extraction des UE, notes partielles et ECTS.

### Vérification de l'Interface & Intégration
- [ ] L'application web démarre sans erreur via `npm run dev` ou `npm start` et répond sur le port local configuré.
- [ ] Le flux de simulation CAS + challenge MFA fonctionne de bout en bout dans l'interface avec retour visuel clair de progression.
- [ ] Les données mises en cache restent consultables même en coupant la connexion réseau (simulation hors-ligne).
- [ ] L'interface ne présente aucun avertissement d'accessibilité critique ni débordement d'affichage sur les résolutions mobiles courantes (375px et plus).
