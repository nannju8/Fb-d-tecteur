export const ANDROID_BRIEF = `BRIEF — VAULT (Android, Kotlin + Jetpack Compose)
Objectif : application personnelle qui ouvre un accès verrouillé à Facebook, collecte de petits lots de vidéos vers un stockage privé, puis les lit hors ligne dans un flux vertical inspiré des codes de Facebook (composants Material 3 personnels, aucune copie d'interface).

1. PRINCIPES NON NÉGOCIABLES
- Pas de contournement de détection : lots de 5 à 15 vidéos, pauses aléatoires, cooldown entre sessions, arrêt immédiat sur défi de sécurité.
- Pas de "robot" distant : le téléchargement est local, séquentiel, sans service tiers.
- Pas d'extraction automatisée non autorisée : l'import manuel (fichier ou lien direct vers un média) est un chemin de première classe.
- Aucune interface Facebook copiée : composants Material 3 maison.

2. MODULES
- access/ : WebView borné (facebook.com, fbcdn.net), shouldOverrideUrlLoading allow-list, détection du cookie c_user via CookieManager, session locale révocable (pas de mot de passe stocké).
- collect/ : machine à états "idle → running → paused → completed/aborted", Guardrails.kt centralisé, chaque item = un tick, délai aléatoire 2,4–6,2 s, espacement minimum côté worker.
- vault/ : Room (ClipEntity, CollectRunEntity, EventEntity), fichiers dans context.filesDir/clips, chiffrement optionnel via EncryptedFile + Android Keystore, aucune exposition MediaStore.
- player/ : Compose VerticalPager + Media3 ExoPlayer, un seul player actif, reprise à watchPosition, contrôles personnalisés, aucun appel réseau pour un fichier local.
- import/ : SAF (OpenDocument) pour les fichiers, lien direct validé, copie dans filesDir, métadonnées éditables.

3. GARDE-FOUS (valeurs identiques à la console web)
targetMin = 5, targetMax = 15, minDelayMs = 2400, maxDelayMs = 6200,
cooldownMs = 45000, challengeAfter = 8, challengeProbability = 0.09,
maxLibraryClips = 120, maxFileBytes = 120 Mo.
Toute valeur reçue de l'UI est re-bornée côté worker. Un défi ou 3 erreurs consécutives ⇒ statut aborted + trace Room.

4. WORKER
- WorkManager OneTimeWorkRequest enchaîné, contrainte NetworkType.CONNECTED, backoff exponentiel.
- Un item à la fois, vérification d'annulation à chaque étape, mise à jour de progression via setProgressAsync.
- En cas d'échec de cache : l'entrée reste en streaming OU est marquée failed, jamais de boucle infinie.
- Téléchargement vers fichier temporaire puis rename atomique ; vérification taille et type MIME avant indexation Room.

5. LECTEUR
- VerticalPager (snap par page), ExoPlayer unique partagé, mise en pause de la page sortante.
- Reprise : watchPosition persisté toutes les 5 s et à la sortie.
- Mode avion testé : tout fichier présent dans filesDir doit se lire sans requête réseau.

6. SÉCURITÉ ET VIE PRIVÉE
- Session révocable depuis l'app (bouton Verrouiller) ; effacer les cookies du WebView à la révocation.
- Fichiers dans filesDir, non exposés dans la galerie ; suppression = fichier + entrée Room.
- Pas de logs de cookies ni d'URL signée ; pas d'analytics.

7. CRITÈRES D'ACCEPTATION
- 5 à 15 vidéos max par session, impossible de dépasser via l'UI ou l'API.
- Deux sessions ne peuvent pas se chevaucher ; cooldown respecté.
- Une session interrompue laisse un motif lisible dans le journal.
- Une vidéo mise hors ligne se lit en mode avion, avec reprise à la seconde près.
- L'import manuel fonctionne sans collecte automatique.
- Suppression d'une vidéo = fichier supprimé du stockage privé.

8. LIMITES ASSUMÉES
Les Reels ne sont pas des URL statiques : accès dépendant de la session, en-têtes, segments DASH/HLS qui expirent. L'extraction automatique n'est pas garantie et peut violer les conditions d'utilisation. L'app doit donc traiter la collecte progressive comme best-effort et l'import manuel comme solution fiable.`;
