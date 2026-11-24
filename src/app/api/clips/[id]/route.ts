import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clips } from "@/db/schema";
import { jsonError, readJson, requireSession } from "@/lib/api";
import { deleteStorageFile } from "@/lib/storage";
import { logEvent, toClipDTO } from "@/lib/vault";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type PatchBody = {
  favorite?: boolean;
  watched?: boolean;
  watchPosition?: number;
  durationSeconds?: number;
};

async function findClip(rawId: string) {
  const id = Number(rawId);
  if (!Number.isFinite(id)) return null;
  const [row] = await db.select().from(clips).where(eq(clips.id, id)).limit(1);
  return row ?? null;
}

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireSession();
  if (gate.response) return gate.response;

  const { id } = await params;
  const clip = await findClip(id);
  if (!clip) return jsonError("Vidéo introuvable.", 404);

  const body = (await readJson<PatchBody>(request)) ?? {};
  const patch: Partial<typeof clips.$inferInsert> = { updatedAt: new Date() };

  if (typeof body.favorite === "boolean") patch.favorite = body.favorite;
  if (typeof body.watched === "boolean") patch.watched = body.watched;
  if (typeof body.watchPosition === "number" && Number.isFinite(body.watchPosition)) {
    patch.watchPosition = Math.max(0, body.watchPosition);
  }
  if (typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds)) {
    patch.durationSeconds = Math.max(0, Math.round(body.durationSeconds));
  }

  const [updated] = await db
    .update(clips)
    .set(patch)
    .where(eq(clips.id, clip.id))
    .returning();

  return Response.json({ clip: toClipDTO(updated) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const gate = await requireSession();
  if (gate.response) return gate.response;

  const { id } = await params;
  const clip = await findClip(id);
  if (!clip) return jsonError("Vidéo introuvable.", 404);

  if (clip.storageKey) {
    await deleteStorageFile(clip.storageKey);
  }
  await db.delete(clips).where(eq(clips.id, clip.id));
  await logEvent({
    kind: "clip_deleted",
    message: `« ${clip.title} » supprimée du coffre.`,
  });

  return Response.json({ ok: true, id: clip.id });
}
