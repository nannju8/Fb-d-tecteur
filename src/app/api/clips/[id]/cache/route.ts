import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clips } from "@/db/schema";
import { jsonError, requireSession } from "@/lib/api";
import {
  cacheRemoteToVault,
  clipStorageKey,
  deleteStorageFile,
  fileExists,
} from "@/lib/storage";
import { logEvent, toClipDTO } from "@/lib/vault";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Auto-cache cap for a single collected item (keeps batches predictable). */
const AUTO_CACHE_MAX_BYTES = 55 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const gate = await requireSession();
  if (gate.response) return gate.response;

  const { id } = await params;
  const clipId = Number(id);
  if (!Number.isFinite(clipId)) return jsonError("Identifiant invalide.", 400);

  const [clip] = await db
    .select()
    .from(clips)
    .where(eq(clips.id, clipId))
    .limit(1);
  if (!clip) return jsonError("Vidéo introuvable.", 404);

  if (clip.storageKey && (await fileExists(clip.storageKey))) {
    return Response.json({ clip: toClipDTO(clip), cached: false });
  }

  if (!clip.remoteUrl) {
    return jsonError(
      "Aucun flux source disponible pour cette vidéo : elle est déjà strictement locale.",
      409,
    );
  }

  const storageKey = clipStorageKey(clip.id);
  try {
    const size = await cacheRemoteToVault(storageKey, clip.remoteUrl, {
      maxBytes: AUTO_CACHE_MAX_BYTES,
      timeoutMs: 45_000,
    });
    const [updated] = await db
      .update(clips)
      .set({
        storageKey,
        sizeBytes: size,
        updatedAt: new Date(),
        status: "ready",
      })
      .where(eq(clips.id, clip.id))
      .returning();

    await logEvent({
      kind: "cache_ok",
      clipId: clip.id,
      message: `« ${clip.title} » enregistrée dans filesDir (${(size / 1024 / 1024).toFixed(1)} Mo) — lecture hors ligne garantie.`,
    });

    return Response.json({ clip: toClipDTO(updated), cached: true });
  } catch (error) {
    await deleteStorageFile(storageKey);
    const detail = error instanceof Error ? error.message : "Erreur inconnue";
    await logEvent({
      kind: "cache_failed",
      clipId: clip.id,
      message: `Mise hors ligne de « ${clip.title} » échouée : ${detail}. Le flux reste lisible en streaming.`,
    });
    return Response.json(
      {
        error:
          "Mise hors ligne impossible (flux protégé, trop volumineux ou réseau indisponible). La vidéo reste disponible en streaming.",
        detail,
      },
      { status: 502 },
    );
  }
}
