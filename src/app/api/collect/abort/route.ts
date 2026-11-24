import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clips, collectRuns } from "@/db/schema";
import { jsonError, readJson, requireSession } from "@/lib/api";
import { getRunningRun, logEvent, toRunDTO } from "@/lib/vault";

export const dynamic = "force-dynamic";

type AbortBody = { runId?: number };

export async function POST(request: Request) {
  const gate = await requireSession();
  if (gate.response) return gate.response;

  const body = (await readJson<AbortBody>(request)) ?? {};
  const requestedId = Number(body.runId);
  const active = await getRunningRun();
  const run = active && (!Number.isFinite(requestedId) || active.id === requestedId)
    ? active
    : null;

  if (!run) return jsonError("Aucune session de collecte en cours.", 409);

  const now = new Date();
  await db
    .update(clips)
    .set({
      status: "aborted",
      failReason: "Lot interrompu manuellement",
      updatedAt: now,
    })
    .where(and(eq(clips.runId, run.id), eq(clips.status, "queued")));

  const [updated] = await db
    .update(collectRuns)
    .set({
      status: "aborted",
      abortReason: "Arrêt manuel demandé depuis la console.",
      finishedAt: now,
      lastTickAt: now,
    })
    .where(eq(collectRuns.id, run.id))
    .returning();

  await logEvent({
    kind: "run_aborted",
    runId: run.id,
    message: `Session #${run.id} arrêtée manuellement après ${run.succeeded} vidéo(s).`,
  });

  return Response.json({ run: toRunDTO(updated ?? run) });
}
