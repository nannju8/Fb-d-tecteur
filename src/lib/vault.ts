import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accessSessions,
  clips,
  collectRuns,
  vaultEvents,
  type ClipRow,
  type CollectRunRow,
  type VaultEventRow,
} from "@/db/schema";
import { DEMO_CATALOG } from "@/lib/catalog";
import { GUARDRAILS } from "@/lib/guardrails";
import { fileExists, fileSize } from "@/lib/storage";
import type {
  ClipDTO,
  EventDTO,
  RunDTO,
  SessionDTO,
  VaultStats,
} from "@/lib/types";

export function toClipDTO(row: ClipRow): ClipDTO {
  return {
    id: row.id,
    runId: row.runId,
    title: row.title,
    author: row.author,
    caption: row.caption,
    origin: row.origin === "manual" ? "manual" : "progressive",
    sourceUrl: row.sourceUrl,
    hasLocalFile: Boolean(row.storageKey),
    remoteUrl: row.remoteUrl,
    thumbnailUrl: row.thumbnailUrl,
    accent: row.accent,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    durationSeconds: row.durationSeconds,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    status: row.status,
    failReason: row.failReason,
    favorite: row.favorite,
    watched: row.watched,
    watchPosition: row.watchPosition,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toRunDTO(row: CollectRunRow): RunDTO {
  return {
    id: row.id,
    targetCount: row.targetCount,
    processed: row.processed,
    succeeded: row.succeeded,
    failed: row.failed,
    status: row.status,
    abortReason: row.abortReason,
    minDelayMs: row.minDelayMs,
    maxDelayMs: row.maxDelayMs,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
  };
}

export function toEventDTO(row: VaultEventRow): EventDTO {
  return {
    id: row.id,
    runId: row.runId,
    clipId: row.clipId,
    kind: row.kind,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getActiveSession(): Promise<SessionDTO | null> {
  const [row] = await db
    .select()
    .from(accessSessions)
    .where(isNull(accessSessions.revokedAt))
    .orderBy(desc(accessSessions.connectedAt))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    accountLabel: row.accountLabel,
    cUserId: row.cUserId,
    scope: row.scope,
    connectedAt: row.connectedAt.toISOString(),
  };
}

export async function logEvent(input: {
  kind: string;
  message: string;
  runId?: number | null;
  clipId?: number | null;
}): Promise<void> {
  await db.insert(vaultEvents).values({
    kind: input.kind,
    message: input.message,
    runId: input.runId ?? null,
    clipId: input.clipId ?? null,
  });
}

export async function getLibrary(): Promise<ClipDTO[]> {
  const rows = await db
    .select()
    .from(clips)
    .where(eq(clips.status, "ready"))
    .orderBy(desc(clips.createdAt), desc(clips.id));
  return rows.map(toClipDTO);
}

export async function getStats(): Promise<VaultStats> {
  const [row] = await db
    .select({
      totalClips: sql<number>`count(*) filter (where ${clips.status} = 'ready')::int`,
      localClips: sql<number>`count(*) filter (where ${clips.status} = 'ready' and ${clips.storageKey} is not null)::int`,
      watchedClips: sql<number>`count(*) filter (where ${clips.watched} = true)::int`,
      favoriteClips: sql<number>`count(*) filter (where ${clips.favorite} = true)::int`,
      storageBytes: sql<number>`coalesce(sum(${clips.sizeBytes}) filter (where ${clips.storageKey} is not null), 0)::bigint`,
    })
    .from(clips);

  const [runAgg] = await db
    .select({
      totalRuns: sql<number>`count(*)::int`,
      lastRunAt: sql<string | null>`max(${collectRuns.startedAt})::text`,
    })
    .from(collectRuns);

  const totalClips = Number(row?.totalClips ?? 0);
  const localClips = Number(row?.localClips ?? 0);
  return {
    totalClips,
    localClips,
    streamedClips: Math.max(0, totalClips - localClips),
    storageBytes: Number(row?.storageBytes ?? 0),
    watchedClips: Number(row?.watchedClips ?? 0),
    favoriteClips: Number(row?.favoriteClips ?? 0),
    totalRuns: Number(runAgg?.totalRuns ?? 0),
    lastRunAt: runAgg?.lastRunAt ?? null,
  };
}

export async function getRecentEvents(limit = 12): Promise<EventDTO[]> {
  const rows = await db
    .select()
    .from(vaultEvents)
    .orderBy(desc(vaultEvents.createdAt), desc(vaultEvents.id))
    .limit(limit);
  return rows.map(toEventDTO);
}

export async function getRuns(limit = 6): Promise<RunDTO[]> {
  const rows = await db
    .select()
    .from(collectRuns)
    .orderBy(desc(collectRuns.startedAt), desc(collectRuns.id))
    .limit(limit);
  return rows.map(toRunDTO);
}

export async function getRunningRun(): Promise<RunDTO | null> {
  const [row] = await db
    .select()
    .from(collectRuns)
    .where(eq(collectRuns.status, "running"))
    .orderBy(desc(collectRuns.startedAt))
    .limit(1);
  return row ? toRunDTO(row) : null;
}

/** Seconds remaining before a new batch can start (0 when allowed). */
export async function cooldownRemaining(): Promise<number> {
  const [row] = await db
    .select({ finishedAt: collectRuns.finishedAt })
    .from(collectRuns)
    .where(sql`${collectRuns.finishedAt} is not null`)
    .orderBy(desc(collectRuns.finishedAt))
    .limit(1);
  if (!row?.finishedAt) return 0;
  const elapsed = Date.now() - row.finishedAt.getTime();
  const remaining = Math.ceil((GUARDRAILS.cooldownMs - elapsed) / 1000);
  return remaining > 0 ? remaining : 0;
}

export async function libraryIsFull(): Promise<boolean> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(clips)
    .where(eq(clips.status, "ready"));
  return Number(row?.value ?? 0) >= GUARDRAILS.maxLibraryClips;
}

let seedPromise: Promise<void> | null = null;

/**
 * Idempotent demo seed: six offline-ready clips so the player and library are
 * usable immediately. The four first clips are real files dropped into the
 * private vault by `scripts/fetch-demo-media.mjs`.
 */
export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedVault().catch((error) => {
      seedPromise = null;
      console.error("seed failed", error);
    });
  }
  return seedPromise;
}

async function seedVault(): Promise<void> {
  const [existing] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(clips);
  if (Number(existing?.value ?? 0) > 0) return;

  const catalog = DEMO_CATALOG.slice(0, 6);
  let seededFiles = 0;

  for (const item of catalog) {
    const hasFile = item.seedFile ? await fileExists(item.seedFile) : false;
    const size = hasFile && item.seedFile ? await fileSize(item.seedFile) : 0;
    if (hasFile) seededFiles += 1;
    await db.insert(clips).values({
      title: item.title,
      author: item.author,
      caption: item.caption,
      origin: "progressive",
      sourceUrl: null,
      storageKey: hasFile ? item.seedFile : null,
      remoteUrl: item.remoteUrl,
      thumbnailUrl: item.thumbnailUrl,
      accent: item.accent,
      mimeType: "video/mp4",
      sizeBytes: size,
      durationSeconds: item.durationSeconds,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      status: "ready",
      watched: false,
    });
  }

  await logEvent({
    kind: "vault_ready",
    message: `${catalog.length} vidéos de démonstration indexées dans le coffre (${seededFiles} fichiers déjà dans filesDir).`,
  });
  await logEvent({
    kind: "guardrail",
    message: `Garde-fous actifs : lots de ${GUARDRAILS.targetMin} à ${GUARDRAILS.targetMax}, pause de ${GUARDRAILS.cooldownMs / 1000} s entre sessions.`,
  });
}

export async function tableExistsCheck(): Promise<boolean> {
  try {
    await db
      .select({ value: sql<number>`count(*)::int` })
      .from(clips)
      .where(and(eq(clips.status, "ready"), isNull(clips.failReason)))
      .limit(1);
    return true;
  } catch {
    return false;
  }
}
