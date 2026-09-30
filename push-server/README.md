# Serveur de rappels — mise en route (≈ 15 min, gratuit)

Les rappels passent par un petit serveur Cloudflare Worker (offre gratuite).
Il ne reçoit **aucune donnée financière** : seulement l'abonnement aux notifications
de ton téléphone, tes horaires, ton fuseau horaire et la date du dernier jour où tu as
noté quelque chose (pour ne pas te relancer si c'est déjà fait).

## Prérequis

- L’appli installée sur l'écran d'accueil de ton iPhone depuis ton site GitHub Pages (iOS 16.4+).
- Node.js sur ton ordinateur et un compte Cloudflare (gratuit).

## 1. Générer les clés

```bash
cd push-server
node generate-vapid.mjs
```

Garde les deux valeurs affichées : la **clé publique** et la **clé privée (JSON)**.

## 2. Créer le stockage

```bash
npm install -g wrangler
wrangler login
wrangler kv namespace create SUBS
```

Copie l'`id` affiché dans `wrangler.toml` (ligne `id = "REMPLACE_PAR_L_ID_DU_KV"`).
Dans `wrangler.toml`, remplace aussi `ALLOWED_ORIGIN = "*"` par l'adresse de ton site,
par exemple `https://ton-pseudo.github.io`.

## 3. Ajouter les secrets

```bash
wrangler secret put VAPID_PUBLIC        # colle la clé publique
wrangler secret put VAPID_PRIVATE_JWK   # colle la clé privée (le JSON complet)
wrangler secret put VAPID_SUBJECT       # mailto:ton-adresse@email.fr
```

## 4. Déployer

```bash
wrangler deploy
```

Note l'adresse affichée, du type `https://cap-rappels.ton-pseudo.workers.dev`.

## 5. Activer dans l’appli

Sur ton iPhone, ouvre l’appli depuis l'icône → Réglages → **Rappels** :

1. Serveur de rappels → colle l'adresse du Worker et la clé publique.
2. Règle l'heure du rappel du soir et le jour/heure du point hebdo.
3. Touche **Activer les notifications**, accepte, puis **Tester**.

## Comment ça marche

- Le Worker se réveille toutes les 15 minutes.
- **Rappel du soir** : envoyé à l'heure choisie, sauf si tu as déjà noté une dépense
  ou touché « Je n'ai rien dépensé aujourd'hui ».
- **Point hebdo** : envoyé le jour et à l'heure choisis, sauf si tu as fait ton point
  dans les 5 derniers jours.
- Toucher la notification ouvre directement la saisie d'une dépense ou le point hebdo.

## En cas de souci

- Pas de notification : vérifie Réglages iPhone → Notifications → (nom de l’appli).
- Logs du serveur : `wrangler tail`.
- Pour tout couper : appli → Réglages → Rappels → Désactiver.
