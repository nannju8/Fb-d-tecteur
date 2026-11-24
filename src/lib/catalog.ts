/**
 * Demo media catalogue.
 *
 * The progressive collector never scrapes a social network. It consumes this
 * licensed stock catalogue (Pexels) so the whole pipeline — queue, random
 * pauses, safety challenge, private caching, offline playback — is testable
 * end to end. In the Android build the same worker interface is fed by the
 * manual importer and by user-authorized exports.
 */
export type DemoItem = {
  key: string;
  title: string;
  author: string;
  caption: string;
  remoteUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  likeCount: number;
  commentCount: number;
  accent: string;
  seedFile?: string;
  sizeBytes: number;
};

export const DEMO_CATALOG: DemoItem[] = [
  {
    key: "neon-street",
    title: "Néons de minuit",
    author: "Alena Darmel",
    caption:
      "Dernière séquence de la série nocturne. Gardée hors ligne pour le montage de dimanche. #neon #nuit",
    remoteUrl:
      "https://videos.pexels.com/video-files/7114935/7114935-hd_1080_1920_24fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/7114935/black-black-model-black-people-chinatown-7114935.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 8,
    likeCount: 1284,
    commentCount: 96,
    accent: "#6d7cff",
    seedFile: "demo-neon-street.mp4",
    sizeBytes: 0,
  },
  {
    key: "chinatown",
    title: "Chinatown, 23 h",
    author: "PNW Production",
    caption: "Lumière rouge, rue vide. La meilleure prise de la session. 🔊",
    remoteUrl:
      "https://videos.pexels.com/video-files/7062344/7062344-hd_1080_1920_24fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/7062344/pexels-photo-7062344.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 6,
    likeCount: 742,
    commentCount: 41,
    accent: "#f2547d",
    seedFile: "demo-chinatown.mp4",
    sizeBytes: 0,
  },
  {
    key: "skate-line",
    title: "Ligne de skate",
    author: "Antoni Shkraba",
    caption:
      "Une ligne propre, sans coupure. Référence pour le storyboard de la semaine prochaine.",
    remoteUrl:
      "https://videos.pexels.com/video-files/4863215/4863215-hd_1066_1920_25fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/4863215/----4863215.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 9,
    likeCount: 3120,
    commentCount: 214,
    accent: "#2fc4a7",
    seedFile: "demo-skate-line.mp4",
    sizeBytes: 0,
  },
  {
    key: "asphalt",
    title: "Asphalte & soleil",
    author: "Polina Tankilevitch",
    caption: "Le plan de coupe parfait : 7 secondes, aucune coupe.",
    remoteUrl:
      "https://videos.pexels.com/video-files/8609014/8609014-hd_1080_1920_25fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/8609014/abstract-adult-asphalt-beach-8609014.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 7,
    likeCount: 968,
    commentCount: 52,
    accent: "#f0a03a",
    seedFile: "demo-asphalt.mp4",
    sizeBytes: 0,
  },
  {
    key: "coffee-ritual",
    title: "Rituel café",
    author: "Phillip Dillow",
    caption:
      "Slow motion serré sur la verse. À revoir hors connexion dans le train.",
    remoteUrl:
      "https://videos.pexels.com/video-files/9423025/9423025-hd_1080_1920_24fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/9423025/pexels-photo-9423025.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 105,
    likeCount: 512,
    commentCount: 33,
    accent: "#c08457",
    sizeBytes: 0,
  },
  {
    key: "red-counterlight",
    title: "Contre-jour rouge",
    author: "cottonbro studio",
    caption:
      "Éclairage rouge, profil net. Conservé pour la palette du projet court-métrage.",
    remoteUrl:
      "https://videos.pexels.com/video-files/10378614/10378614-uhd_2160_4096_25fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/10378614/pexels-photo-10378614.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 18,
    likeCount: 2043,
    commentCount: 173,
    accent: "#e14b4b",
    sizeBytes: 0,
  },
  {
    key: "skate-park",
    title: "Skate park, 18 h",
    author: "cottonbro studio",
    caption: "Fin de journée au park, série de figures enchaînées.",
    remoteUrl:
      "https://videos.pexels.com/video-files/5039532/5039532-uhd_2160_4096_25fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/5039532/pexels-photo-5039532.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 17,
    likeCount: 1760,
    commentCount: 88,
    accent: "#3f9cff",
    sizeBytes: 0,
  },
  {
    key: "neon-portrait",
    title: "Portrait néon",
    author: "Alena Darmel",
    caption: "Série cyberpunk, prise 4. Le grain est déjà dans l'image.",
    remoteUrl:
      "https://videos.pexels.com/video-files/6944416/6944416-uhd_2160_3840_25fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/6944416/cyberpunk-neon-neon-art-neon-lights-6944416.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 8,
    likeCount: 4210,
    commentCount: 302,
    accent: "#a855f7",
    sizeBytes: 0,
  },
  {
    key: "tv-set",
    title: "Plateau TV",
    author: "Alena Darmel",
    caption: "Coulisses du plateau, lumière magenta.",
    remoteUrl:
      "https://videos.pexels.com/video-files/6944415/6944415-uhd_2160_3840_25fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/6944415/cyberpunk-neon-neon-art-neon-lights-6944415.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 8,
    likeCount: 655,
    commentCount: 27,
    accent: "#ff5db1",
    sizeBytes: 0,
  },
  {
    key: "crew-skate",
    title: "Crew au skatepark",
    author: "Artem Podrez",
    caption: "Plan large, quatre riders, aucune coupure.",
    remoteUrl:
      "https://videos.pexels.com/video-files/4824398/4824398-uhd_2160_3840_30fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/4824398/pexels-photo-4824398.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 13,
    likeCount: 1502,
    commentCount: 64,
    accent: "#38bdf8",
    sizeBytes: 0,
  },
  {
    key: "pour-over",
    title: "Pour over, plan serré",
    author: "Airam Dato-on",
    caption: "Détail de extraction, 6 secondes utiles.",
    remoteUrl:
      "https://videos.pexels.com/video-files/40047525/17094964_2160_3840_24fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/40047525/chicago-40047525.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 6,
    likeCount: 388,
    commentCount: 19,
    accent: "#b45309",
    sizeBytes: 0,
  },
  {
    key: "milk-coffee",
    title: "Lait & café",
    author: "Nicola Barts",
    caption: "Texture crémeuse, parfait pour l'intro du montage.",
    remoteUrl:
      "https://videos.pexels.com/video-files/7930826/7930826-uhd_2160_3840_24fps.mp4",
    thumbnailUrl:
      "https://images.pexels.com/videos/7930826/pexels-photo-7930826.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
    durationSeconds: 12,
    likeCount: 712,
    commentCount: 44,
    accent: "#d97706",
    sizeBytes: 0,
  },
];

export const VOCABULARY = {
  pause: [
    "Pause aléatoire",
    "Respiration",
    "Délai variable",
    "Attente courte",
  ],
  success: [
    "Vidéo indexée dans le coffre",
    "Média enregistré localement",
    "Fichier rattaché à la bibliothèque",
  ],
  failure: [
    "Flux indisponible, entrée ignorée",
    "Segment expiré, aucune donnée conservée",
    "Échec de récupération, arrêt prudent",
  ],
};

export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
