import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clips, collectRuns, vaultEvents } from "@/db/schema";
import { jsonError, readJson, requireSession } from "@/lib/api";
import { GUARDRAILS, randomDelayMs } from "@/lib/guardrails";
import { pick, VOCABULARY } from "@/lib/catalog";
import { logEvent, toEventDTO, toRunDTO } from "@/lib/vault";

export const dynamic = "force-dynamic";

type TickBody = { runId?: number };

/**
 * One worker tick == one item of the batch. The client calls this, waits for
 * the returned random delay, then calls it again. The server also refuses
 * ticks that arrive faster than `minTickSpacingMs`, so a patched client cannot
 * turn the collector into a burst.
 */
export async function POST(request: Request) {
  const gate = await requireSession();
  if (gate.response) return gate.response;

  const body = (await readJson<TickBody>(request)) ?? {};
  const runId = Number(body.runId);
  if (!Number.isFinite(runId)) return jsonError("runId manquant.", 400);

  const [run] = await db
    .select()
    .from(collectRuns)
    .where(eq(collectRuns.id, runId))
    .limit(1);
  if (!run) return jsonError("Session de collecte introuvable.", 404);

  if (run.status !== "running") {
    return Response.json({ run: toRunDTO(run), done: true, events: [] });
  }

  if (run.lastTickAt) {
    const elapsed = Date.now() - run.lastTickAt.getTime();
    if (elapsed < GUARDRAILS.minTickSpacingMs) {
      return Response.json(
        {
          error: "Cadence trop rapide : le collecteur impose une pause.",
          retryAfterMs: GUARDRAILS.minTickSpacingMs - elapsed,
        },
        { status: 429 },
      );
    }
  }

  const [next] = await db
    .select()
    .from(clips)
    .where(and(eq(clips.runId, run.id), eq(clips.status, "queued")))
    .orderBy(asc(clips.id))
    .limit(1);

  if (!next) {
    const [finished] = await db
      .update(collectRuns)
      .set({
        status: "completed",
        finishedAt: new Date(),
        lastTickAt: new Date(),
      })
      .where(eq(collectRuns.id, run.id))
      .returning();
    await logEvent({
      kind: "run_completed",
      runId: run.id,
      message: `Session #${run.id} terminée : ${finished?.succeeded ?? run.succeeded} vidéos prêtes, ${finished?.failed ?? 0} échec(s).`,
    });
    return Response.json({
      run: toRunDTO(finished ?? run),
      done: true,
      events: [],
      nextDelayMs: 0,
    });
  }

  const newEvents: (typeof vaultEvents.$inferSelect)[] = [];
  const record = async (kind: string, message: string) => {
    const [row] = await db
      .insert(vaultEvents)
      .values({ kind, message, runId: run.id, clipId: next.id })
      .returning();
    newEvents.push(row);
  };

  // Safety challenge: only possible after a few successful items, and it
  // aborts the whole batch rather than trying to work around it.
  const challenge =
    run.succeeded >= GUARDRAILS.challengeAfter &&
    Math.random() < GUARDRAILS.challengeProbability;

  if (challenge) {
    const now = new Date();
    await db
      .update(clips)
      .set({
        status: "aborted",
        failReason: "Défi de sécurité détecté — arrêt volontaire",
        updatedAt: now,
      })
      .where(and(eq(clips.runId, run.id), eq(clips.status, "queued")));

    const [aborted] = await db
      .update(collectRuns)
      .set({
        status: "aborted",
        abortReason:
          "Défi de sécurité sur le compte : le lot a été interrompu immédiatement.",
        finishedAt: now,
        lastTickAt: now,
      })
      .where(eq(collectRuns.id, run.id))
      .returning();

    await record(
      "challenge_detected",
      "Signal de vérification détecté. Aucune tentative de contournement : la session est arrêtée.",
    );
    await logEvent({
      kind: "run_aborted",
      runId: run.id,
      message: `Session #${run.id} interrompue après ${run.succeeded} vidéo(s). Reprise possible après ${GUARDRAILS.cooldownMs / 1000} s de pause.`,
    });

    return Response.json({
      run: toRunDTO(aborted ?? run),
      aborted: true,
      done: true,
      nextDelayMs: 0,
      events: newEvents.map(toEventDTO),
    });
  }

  const transientFailure = Math.random() < GUARDRAILS.transientFailureProbability;
  let item: { clipId: number; title: string; outcome: "ready" | "failed" };
  let autoCache = false;

  if (transientFailure) {
    const reason = pick([
      "Flux protégé par token : aucun média conservé",
      "Segments DASH expirés pendant la récupération",
      "La source n'a pas répondu dans le délai imparti",
    ]);
    await db
      .update(clips)
      .set({ status: "failed", failReason: reason, updatedAt: new Date() })
      .where(eq(clips.id, next.id));
    await record("fetch_failed", `« ${next.title} » ignorée — ${reason}.`);
    item = { clipId: next.id, title: next.title, outcome: "failed" };
  } else {
    await db
      .update(clips)
      .set({
        status: "ready",
        failReason: null,
        updatedAt: new Date(),
        watched: false,
        watchPosition: 0,
      })
      .where(eq(clips.id, next.id));
    await record("fetch_ok", `${pick(VOCABULARY.success)} : « ${next.title} ».`);
    autoCache = Boolean(next.remoteUrl);
    item = { clipId: next.id, title: next.title, outcome: "ready" };
  }

  const [otherQueued] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(clips)
    .where(and(eq(clips.runId, run.id), eq(clips.status, "queued")));

  const remaining = Number(otherQueued?.value ?? 0);
  const processed = run.processed + 1;
  const succeeded = run.succeeded + (transientFailure ? 0 : 1);
  const failed = run.failed + (transientFailure ? 1 : 0);
  const now = new Date();

  const [updated] = await db
    .update(collectRuns)
    .set({
      processed,
      succeeded,
      failed,
      lastTickAt: now,
      ...(remaining === 0
        ? { status: "completed", finishedAt: now }
        : {}),
    })
    .where(eq(collectRuns.id, run.id))
    .returning();

  if (remaining === 0) {
    await logEvent({
      kind: "run_completed",
      runId: run.id,
      message: `Session #${run.id} terminée : ${succeeded} vidéo(s) prêtes, ${failed} échec(s).`,
    });
  } else {
    const pause = randomDelayMs();
    await logEvent({
      kind: "pause",
      runId: run.id,
      message: `${pick(VOCABULARY.pause)} de ${(pause / 1000).toFixed(1)} s avant la prochaine entrée.`,
    });
  }

  return Response.json({
    run: toRunDTO(updated ?? run),
    item,
    autoCache,
    done: remaining === 0,
    nextDelayMs: remaining === 0 ? 0 : randomDelayMs(),
    events: newEvents.map(toEventDTO),
  });
}
