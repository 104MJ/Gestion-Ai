# Appli budget — Vue 3

Appli de budget personnelle, **100 % locale** : tes données restent sur ton téléphone
(IndexedDB). Installable sur iPhone comme une vraie appli (PWA), fonctionne hors-ligne.

## Stack

| Rôle           | Techno                                                          |
| -------------- | --------------------------------------------------------------- |
| Interface      | Vue 3 (`<script setup>`), Vue Router (mode hash)                |
| État           | Pinia (`stores/`) + état réactif du domaine (`domain/model.js`) |
| Stockage local | Dexie.js sur IndexedDB (`db.js`)                                |
| PWA            | vite-plugin-pwa (stratégie `injectManifest`), Workbox           |
| Build          | Vite                                                            |
| Tests          | Vitest (logique métier)                                         |
| Rappels        | Cloudflare Worker + Web Push (`push-server/`)                   |
| Déploiement    | GitHub Pages via GitHub Actions                                 |

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests de la logique métier
npm run build      # génère dist/
npm run preview    # teste le build (service worker compris)
npm run format     # remet tout le code en forme (Prettier)
```

Le style du code est défini dans `.prettierrc.json` (lignes de 100 caractères max).
Dans VS Code, installe l'extension **Prettier** et active « Format on Save ».

## Structure

```
src/
  config.js            ← NOM DE L'APPLI (à changer ici)
  main.js              démarrage : Pinia, router, chargement des données
  App.vue              fond photo, onglets, bouton +, feuilles, toast
  router.js            routes (#/, #/depenses, #/courses, …)
  db.js                schéma Dexie + lecture/écriture par table
  domain/              logique métier, sans interface (testable) :
    model.js             point d'entrée qui réexporte tout
    state.js             état global, valeurs par défaut
    budget.js            budget du mois, montant du jour, série
    subscriptions.js     abonnements
    goals.js             rêve et révélation de la photo
    groceries.js         courses et listes
    vaults.js            coffres
    debts.js             « On me doit »
    weeklyCheck.js       point hebdo avec la banque
    bankImport.js        import du relevé CSV
    story.js             texte des chapitres
    demo.js              données de démo
    utils.js, dates.js, money.js, icons.js
  stores/data.js       charge et enregistre automatiquement les données
  stores/ui.js         feuille ouverte, toast, confirmation
  actions.js           actions partagées (versement au rêve, rappels, exports)
  views/               un écran par onglet
  sheets/              les formulaires en bas d'écran (dépense, abonnement…)
  components/          icônes, barres, ligne d'opération, onboarding…
  sw.js                service worker : hors-ligne + notifications
  assets/main.css      styles (thème clair/sombre)
push-server/           serveur de rappels (voir son README)
```

## Où sont les données

- **IndexedDB** (base `cap-budget`) : une table par collection (opérations,
  abonnements, rêves, coffres, courses…) et les photos.
- Les réglages simples (revenus, modules, rappels…) sont dans la table `kv`.
- **Migration automatique** : si la version précédente de l'appli (sans framework)
  était installée à la même adresse, ses données sont reprises au premier lancement.
- Sauvegarde / restauration : Réglages → Données (fichier JSON avec les photos).

## Changer le nom de l'appli

Modifie `APP_NAME` dans `src/config.js`, remplace les icônes dans `public/icons/`,
puis rebuild. Le nom est utilisé pour le titre, l'écran d'accueil de l'iPhone,
les textes et les noms de fichiers exportés.

## Déployer sur GitHub Pages

1. Crée un dépôt GitHub et pousse le projet sur `main`.
2. Settings → Pages → Source : **GitHub Actions**.
3. Chaque `git push` lance `.github/workflows/deploy.yml` : tests, build, publication.
4. Sur l'iPhone : ouvre l'adresse dans Safari → Partager → **Sur l'écran d'accueil**.

## Rappels (notifications)

Voir `push-server/README.md` (≈ 15 min, gratuit). Les notifications ouvrent
directement la saisie d'une dépense (`#/?do=depense`) ou le point hebdo (`#/?do=point`).

## Ajouter une fonctionnalité

- Un calcul → une fonction dans le bon fichier de `domain/` + un test dans `src/test/`.
- Un écran → `views/` + une route dans `router.js`.
- Un formulaire → `sheets/`, exporté dans `sheets/index.js`, ouvert avec
  `useUI().open('NomDuSheet', { props })`.
- Toute modification de `S` (l'état) est enregistrée automatiquement.
