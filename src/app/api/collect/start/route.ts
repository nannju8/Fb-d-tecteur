import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clips, collectRuns } from "@/db/schema";
import { jsonError, readJson, requireSession } from "@/lib/api";
import { DEMO_CATALOG } from "@/lib/catalog";
import { GUARDRAILS, clampTarget } from "@/lib/guardrails";
import {
  cooldownRemaining,
  getRunningRun,
  getStats,
  libraryIsFull,
  logEvent,
  toRunDTO,
} from "@/lib/vault";

export const dynamic = "force-dynamic";

type StartBody = { target?: number };

export async function POST(request: Request) {
  const gate = await requireSession();
  if (gate.response) return gate.response;

  const body = (await readJson<StartBody>(request)) ?? {};
  const requested = Number(body.target);
  const clampToCapacity = clampTarget(requested);
  const stats = await getStats();
  const remainingCapacity = Math.max(
    0,
    GUARDRAILS.maxLibraryClips - stats.totalClips,
  );
  const target = Math.min(clampToCapacity, remainingCapacity);
  if (target < GUARDRAILS.targetMin) {
    return jsonError(
      `Capacité restante insuffisante (${remainingCapacity} place(s)). Supprimez des vidéos pour rouvrir une session complète.`,
      409,
    );
  }

  const running = await getRunningRun();
  if (running) {
    return jsonError(
      "Une session de collecte est déjà en cours. Terminez-la avant d'en ouvrir une nouvelle.",
      409,
    );
  }

  const cooldown = await cooldownRemaining();
  if (cooldown > 0) {
    return Response.json(
      {
        error: `Pause de sécurité : attendez ${cooldown} s avant une nouvelle session.`,
        retryAfter: cooldown,
      },
      { status: 429 },
    );
  }

  if (await libraryIsFull()) {
    return jsonError(
      `Coffre plein (${GUARDRAILS.maxLibraryClips} vidéos maximum). Supprimez des entrées avant de collecter.`,
      409,
    );
  }

  const [run] = await db
    .insert(collectRuns)
    .values({
      targetCount: target,
      minDelayMs: GUARDRAILS.minDelayMs,
      maxDelayMs: GUARDRAILS.maxDelayMs,
      status: "running",
    })
    .returning();

  // Prefer compact HD demo sources so the private cache step stays fast.
  const pool = [...DEMO_CATALOG].sort((a, b) => {
    const score = (url: string) => (url.includes("-hd_") ? 0 : 1);
    return score(a.remoteUrl) - score(b.remoteUrl);
  });

  const queued: { id: number; title: string }[] = [];
  for (let index = 0; index < target; index += 1) {
    const item = pool[index % pool.length];
    const [row] = await db
      .insert(clips)
      .values({
        runId: run.id,
        title: index >= pool.length ? `${item.title} · ${index + 1}` : item.title,
        author: item.author,
        caption: item.caption,
        origin: "progressive",
        sourceUrl: null,
        remoteUrl: item.remoteUrl,
        thumbnailUrl: item.thumbnailUrl,
        accent: item.accent,
        durationSeconds: item.durationSeconds,
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        status: "queued",
      })
      .returning({ id: clips.id, title: clips.title });
    queued.push(row);
  }

  await logEvent({
    kind: "run_started",
    runId: run.id,
    message: `Session #${run.id} ouverte : ${target} vidéos demandées (maximum autorisé ${GUARDRAILS.targetMax}). Pauses aléatoires ${GUARDRAILS.minDelayMs / 1000}–${GUARDRAILS.maxDelayMs / 1000} s.`,
  });

  if (Number.isFinite(requested) && requested > GUARDRAILS.targetMax) {
    await logEvent({
      kind: "guardrail",
      runId: run.id,
      message: `Quantité ramenée de ${Math.round(requested)} à ${GUARDRAILS.targetMax} par le garde-fou serveur.`,
      });
  }

  const [fresh] = await db
    .select()
    .from(collectRuns)
    .where(eq(collectRuns.id, run.id))
    .limit(1);

  return Response.json(
    {
      run: toRunDTO(fresh ?? run),
      queuedCount: queued.length,
      clamped: Number.isFinite(requested) && requested !== target,
      target,
    },
    { status: 201 },
  );
}

/** Restart helper: exposes the next queued item without mutating anything. */
export async function GET() {
  const gate = await requireSession();
  if (gate.response) return gate.response;
  const [run] = await db
    .select()
    .from(collectRuns)
    .where(eq(collectRuns.status, "running"))
    .orderBy(desc(collectRuns.startedAt))
    .limit(1);
  if (!run) return Response.json({ run: null, next: null });
  const [next] = await db
    .select({ id: clips.id, title: clips.title })
    .from(clips)
    .where(and(eq(clips.runId, run.id), eq(clips.status, "queued")))
    .orderBy(asc(clips.id))
    .limit(1);
  return Response.json({ run: toRunDTO(run), next: next ?? null });
}
