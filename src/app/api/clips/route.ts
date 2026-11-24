import { db } from "@/db";
import { clips } from "@/db/schema";
import { jsonError, requireSession } from "@/lib/api";
import { GUARDRAILS, isAllowedDomain } from "@/lib/guardrails";
import {
  clipStorageKey,
  deleteStorageFile,
  saveUploadToVault,
} from "@/lib/storage";
import {
  getLibrary,
  libraryIsFull,
  logEvent,
  toClipDTO,
} from "@/lib/vault";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ACCENTS = ["#6d7cff", "#2fc4a7", "#f2547d", "#f0a03a", "#a855f7"];

export async function GET() {
  const gate = await requireSession();
  if (gate.response) return gate.response;
  return Response.json({ clips: await getLibrary() });
}

/** Manual import: upload a local video file, or register a direct media link. */
export async function POST(request: Request) {
  const gate = await requireSession();
  if (gate.response) return gate.response;

  if (await libraryIsFull()) {
    return jsonError(
      `Coffre plein (${GUARDRAILS.maxLibraryClips} vidéos). Supprimez une entrée avant d'importer.`,
      409,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Requête multipart invalide.", 400);
  }

  const fileEntry = form.get("file");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
  const titleInput = String(form.get("title") ?? "").trim();
  const author = String(form.get("author") ?? "").trim() || "Import local";
  const caption = String(form.get("caption") ?? "").trim();
  const sourceUrl = String(form.get("sourceUrl") ?? "").trim();
  const durationRaw = Number(form.get("duration") ?? 0);
  const durationSeconds = Number.isFinite(durationRaw)
    ? Math.min(7200, Math.max(0, Math.round(durationRaw)))
    : 0;
  const accent = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];

  if (!file && !sourceUrl) {
    return jsonError(
      "Ajoutez un fichier vidéo ou un lien direct vers un média.",
      422,
    );
  }

  // --- File import ---------------------------------------------------------
  if (file) {
    const extension = file.type.includes("webm")
      ? "webm"
      : file.type.includes("quicktime")
        ? "mov"
        : file.type.includes("mpeg")
          ? "mpeg"
          : "mp4";
    const storageKey = clipStorageKey(Date.now(), extension);
    try {
      const size = await saveUploadToVault(storageKey, file);
      const title =
        titleInput ||
        (file.name ? file.name.replace(/\.[a-z0-9]+$/i, "") : "Vidéo importée");
      const [row] = await db
        .insert(clips)
        .values({
          title: title.slice(0, 120),
          author: author.slice(0, 80),
          caption: caption.slice(0, 600),
          origin: "manual",
          sourceUrl: sourceUrl || null,
          storageKey,
          remoteUrl: null,
          thumbnailUrl: null,
          accent,
          mimeType: file.type || "video/mp4",
          sizeBytes: size,
          durationSeconds,
          status: "ready",
        })
        .returning();

      await logEvent({
        kind: "manual_import",
        clipId: row.id,
        message: `Import local : « ${row.title} » (${(size / 1024 / 1024).toFixed(1)} Mo) copié dans filesDir.`,
      });

      return Response.json({ clip: toClipDTO(row) }, { status: 201 });
    } catch (error) {
      await deleteStorageFile(storageKey);
      return jsonError(
        "Impossible d'enregistrer le fichier dans le stockage privé.",
        500,
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  // --- Direct media link ---------------------------------------------------
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return jsonError("Lien invalide.", 400);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return jsonError("Seuls les liens http(s) sont acceptés.", 400);
  }

  const direct = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(parsed.pathname + parsed.search);
  if (!direct) {
    return jsonError(
      "Ce lien n'est pas un fichier média direct. L'extraction automatique depuis un réseau social n'est pas prise en charge : exportez la vidéo depuis une source autorisée, puis importez le fichier.",
      422,
      "Le collecteur et l'import ne contournent volontairement aucune protection d'accès.",
    );
  }

  const allowed = isAllowedDomain(sourceUrl);
  const [row] = await db
    .insert(clips)
    .values({
      title: (titleInput || parsed.pathname.split("/").pop() || "Vidéo liée").slice(0, 120),
      author: author.slice(0, 80),
      caption: caption.slice(0, 600),
      origin: "manual",
      sourceUrl,
      storageKey: null,
      remoteUrl: sourceUrl,
      thumbnailUrl: null,
      accent,
      durationSeconds,
      status: "ready",
    })
    .returning();

  await logEvent({
    kind: "manual_import",
    clipId: row.id,
    message: `Lien média direct ajouté : « ${row.title} ». Mise hors ligne disponible depuis la bibliothèque.`,
  });

  return Response.json(
    {
      clip: toClipDTO(row),
      warning: allowed
        ? undefined
        : "Domaine hors liste blanche Facebook : aucune donnée de session ne sera envoyée.",
    },
    { status: 201 },
  );
}
