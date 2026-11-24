# Vault — Reels hors ligne, sous contrôle

Prototype fullstack (Next.js App Router + PostgreSQL/Drizzle) du brief Android
Kotlin/Compose. Il exécute le parcours complet côté web :

1. **Accès verrouillé** — une session locale révocable déverrouille le coffre
   (démo en un clic ou marqueur `c_user`). Aucun identifiant Facebook n'est
   stocké, aucun scraping n'est effectué.
2. **Collecte contrôlée** — lots bornés serveur de 5 à 15 entrées, pauses
   aléatoires, espacement minimum des ticks, arrêt immédiat sur défi de
   sécurité, cooldown de 45 s entre sessions, plafond de 120 vidéos.
3. **Coffre privé** — les médias copiés vivent dans `.data/vault` (équivalent
   `filesDir`), indexés en base. Ils ne sont servis que par `/api/media/[id]`
   quand le coffre est ouvert, avec support des requêtes `Range`.
4. **Import manuel** — fichier vidéo (durée extraite côté client) ou lien
   direct vers un média, comme chemin de repli fiable.
5. **Lecteur** — flux vertical snap, autoplay, reprise de lecture, favoris,
   mise hors ligne à la demande, raccourcis clavier.
6. **Plan technique** — `/blueprint` contient la correspondance module par
   module et les snippets Kotlin/Compose/Room/WorkManager/Media3, plus le brief
   copiable.

## Démarrage

```bash
node scripts/fetch-demo-media.mjs   # 4 clips de démonstration (Pexels) dans .data/vault
npx drizzle-kit push                # schéma PostgreSQL
npm run build && npm start
```

Le seed applicatif est idempotent : au premier chargement, six vidéos de
démonstration sont indexées.

## Variables d'environnement

- `DATABASE_URL` — connexion PostgreSQL (voir `.env`).

## Périmètre assumé

Le collecteur consomme un catalogue de démonstration sous licence. Il ne
contourne aucune protection d'accès et n'extrait rien d'un réseau social. Sur
Android, la collecte progressive reste best-effort (les Reels dépendent de la
session, d'en-têtes et de segments DASH/HLS éphémères) ; l'import manuel est la
voie fiable et conforme pour vos propres contenus. Vérifiez les conditions
d'utilisation des plateformes concernées.
