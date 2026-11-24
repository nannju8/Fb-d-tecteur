import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Access sessions are the "locked gate" equivalent of a WebView session on
 * Android. No Facebook token is ever stored: only a local, revocable session
 * record that unlocks the vault.
 */
export const accessSessions = pgTable("access_sessions", {
  id: serial("id").primaryKey(),
  accountLabel: text("account_label").notNull(),
  cUserId: text("c_user_id").notNull(),
  scope: text("scope").notNull().default("facebook.com,fbcdn.net"),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  lockReason: text("lock_reason"),
});

/**
 * A guarded collection run. Batches are deliberately small and the API
 * enforces the same constants as the Android guardrails.
 */
export const collectRuns = pgTable("collect_runs", {
  id: serial("id").primaryKey(),
  targetCount: integer("target_count").notNull(),
  processed: integer("processed").notNull().default(0),
  succeeded: integer("succeeded").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  status: text("status").notNull().default("running"),
  abortReason: text("abort_reason"),
  minDelayMs: integer("min_delay_ms").notNull().default(2400),
  maxDelayMs: integer("max_delay_ms").notNull().default(6200),
  lastTickAt: timestamp("last_tick_at"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

/**
 * Offline media index — the web counterpart of the Room `ClipEntity` table.
 */
export const clips = pgTable("clips", {
  id: serial("id").primaryKey(),
  runId: integer("run_id"),
  title: text("title").notNull(),
  author: text("author").notNull().default("Compte personnel"),
  caption: text("caption").notNull().default(""),
  origin: text("origin").notNull().default("progressive"),
  sourceUrl: text("source_url"),
  storageKey: text("storage_key"),
  remoteUrl: text("remote_url"),
  thumbnailUrl: text("thumbnail_url"),
  accent: text("accent").notNull().default("#5b8cff"),
  mimeType: text("mime_type").notNull().default("video/mp4"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  status: text("status").notNull().default("queued"),
  failReason: text("fail_reason"),
  favorite: boolean("favorite").notNull().default(false),
  watched: boolean("watched").notNull().default(false),
  watchPosition: real("watch_position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Append-only activity ledger shown in the app (collector pauses, safety
 * challenges, imports, playback events).
 */
export const vaultEvents = pgTable("vault_events", {
  id: serial("id").primaryKey(),
  runId: integer("run_id"),
  clipId: integer("clip_id"),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AccessSessionRow = typeof accessSessions.$inferSelect;
export type CollectRunRow = typeof collectRuns.$inferSelect;
export type ClipRow = typeof clips.$inferSelect;
export type VaultEventRow = typeof vaultEvents.$inferSelect;
