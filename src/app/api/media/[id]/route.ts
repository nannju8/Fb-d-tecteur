import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clips } from "@/db/schema";
import { getActiveSession } from "@/lib/vault";
import { fileExists, streamLocalFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Media endpoint — the only way to read a private clip. Each request is gated
 * by the vault session and local files are streamed with Range support so the
 * player can seek without downloading the whole file again.
 */
export async function GET(request: Request, { params }: Params) {
  const session = await getActiveSession();
  if (!session) {
    return Response.json({ error: "Coffre verrouillé." }, { status: 423 });
  }

  const { id } = await params;
  const clipId = Number(id);
  if (!Number.isFinite(clipId)) {
    return Response.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const [clip] = await db
    .select()
    .from(clips)
    .where(eq(clips.id, clipId))
    .limit(1);
  if (!clip) return Response.json({ error: "Introuvable." }, { status: 404 });

  if (clip.storageKey && (await fileExists(clip.storageKey))) {
    const range = request.headers.get("range");
    const result = await streamLocalFile(clip.storageKey, clip.mimeType, range);
    return new Response(result.stream, {
      status: result.status,
      headers: {
        ...result.headers,
        "X-Vault-Source": "local",
      },
    });
  }

  if (clip.remoteUrl) {
    return Response.redirect(clip.remoteUrl, 302);
  }

  return Response.json(
    { error: "Média indisponible : fichier absent du stockage privé." },
    { status: 404 },
  );
}
