export type ClipDTO = {
  id: number;
  runId: number | null;
  title: string;
  author: string;
  caption: string;
  origin: "progressive" | "manual";
  sourceUrl: string | null;
  hasLocalFile: boolean;
  remoteUrl: string | null;
  thumbnailUrl: string | null;
  accent: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  likeCount: number;
  commentCount: number;
  status: string;
  failReason: string | null;
  favorite: boolean;
  watched: boolean;
  watchPosition: number;
  createdAt: string;
};

export type SessionDTO = {
  id: number;
  accountLabel: string;
  cUserId: string;
  scope: string;
  connectedAt: string;
};

export type RunDTO = {
  id: number;
  targetCount: number;
  processed: number;
  succeeded: number;
  failed: number;
  status: string;
  abortReason: string | null;
  minDelayMs: number;
  maxDelayMs: number;
  startedAt: string;
  finishedAt: string | null;
};

export type EventDTO = {
  id: number;
  runId: number | null;
  clipId: number | null;
  kind: string;
  message: string;
  createdAt: string;
};

export type VaultStats = {
  totalClips: number;
  localClips: number;
  streamedClips: number;
  storageBytes: number;
  watchedClips: number;
  favoriteClips: number;
  totalRuns: number;
  lastRunAt: string | null;
};

export type CollectTickResponse = {
  run: RunDTO;
  item?: {
    clipId: number;
    title: string;
    outcome: "ready" | "failed";
  };
  nextDelayMs: number;
  events: EventDTO[];
};

export type ApiError = { error: string; detail?: string };
