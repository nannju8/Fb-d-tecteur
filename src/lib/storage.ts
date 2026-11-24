import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { GUARDRAILS } from "@/lib/guardrails";

/**
 * Private media directory. This is the server counterpart of Android's
 * `context.filesDir/clips`: nothing here is reachable through a public path,
 * every read goes through an authenticated route handler.
 */
export const VAULT_DIR = path.join(process.cwd(), ".data", "vault");

export async function ensureVaultDir(): Promise<void> {
  await fs.mkdir(VAULT_DIR, { recursive: true });
}

export function resolveStoragePath(storageKey: string): string {
  const safe = path.basename(storageKey);
  return path.join(VAULT_DIR, safe);
}

export async function fileExists(storageKey: string): Promise<boolean> {
  try {
    const stats = await fs.stat(resolveStoragePath(storageKey));
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function fileSize(storageKey: string): Promise<number> {
  try {
    const stats = await fs.stat(resolveStoragePath(storageKey));
    return stats.size;
  } catch {
    return 0;
  }
}

export async function deleteStorageFile(storageKey: string): Promise<void> {
  try {
    await fs.unlink(resolveStoragePath(storageKey));
  } catch {
    // Already gone: nothing to do.
  }
}

export function clipStorageKey(clipId: number, extension = "mp4"): string {
  return `clip-${clipId}-${Date.now().toString(36)}.${extension}`;
}

/**
 * Streams a remote media file into the private vault. Used by the manual
 * import route and by the "make offline" action. Size is capped and the
 * download is written to a temp file before being atomically renamed.
 */
export async function cacheRemoteToVault(
  storageKey: string,
  remoteUrl: string,
  options: { maxBytes?: number; timeoutMs?: number } = {},
  signal?: AbortSignal,
): Promise<number> {
  const maxBytes = options.maxBytes ?? GUARDRAILS.maxFileBytes;
  await ensureVaultDir();
  const target = resolveStoragePath(storageKey);
  const temp = `${target}.part`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 90_000,
  );
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(remoteUrl, {
      signal: controller.signal,
      headers: {
        Accept: "video/mp4,video/*;q=0.9,*/*;q=0.5",
        "User-Agent": "OfflineVault/1.0 (personal archiving prototype)",
      },
    });

    if (!response.ok || !response.body) {
      throw new Error(`Réponse média ${response.status}`);
    }

    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > maxBytes) {
      throw new Error("Fichier trop volumineux pour le stockage privé");
    }

    let written = 0;
    const nodeStream = Readable.fromWeb(
      response.body as import("node:stream/web").ReadableStream,
    );
    nodeStream.on("data", (chunk: Buffer) => {
      written += chunk.length;
      if (written > maxBytes) {
        controller.abort();
      }
    });

    await pipeline(nodeStream, createWriteStream(temp));
    await fs.rename(temp, target);
    return written;
  } catch (error) {
    await fs.rm(temp, { force: true });
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Persists an uploaded file (manual import) into the private vault. */
export async function saveUploadToVault(
  storageKey: string,
  file: File,
): Promise<number> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Seuls les fichiers vidéo sont acceptés.");
  }
  if (file.size > GUARDRAILS.maxFileBytes) {
    throw new Error(
      `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo, limite ${GUARDRAILS.maxFileBytes / 1024 / 1024} Mo).`,
    );
  }
  await ensureVaultDir();
  const target = resolveStoragePath(storageKey);
  const temp = `${target}.part`;
  const webStream = file.stream() as unknown as import("node:stream/web").ReadableStream;
  const nodeStream = Readable.fromWeb(webStream);
  try {
    await pipeline(nodeStream, createWriteStream(temp));
    await fs.rename(temp, target);
  } catch (error) {
    await fs.rm(temp, { force: true });
    throw error;
  }
  return file.size;
}

export type RangeResult = {
  stream: ReadableStream;
  status: number;
  headers: Record<string, string>;
};

/** Range-aware local file streaming (needed for seeking in the player). */
export async function streamLocalFile(
  storageKey: string,
  mimeType: string,
  rangeHeader: string | null,
): Promise<RangeResult> {
  const filePath = resolveStoragePath(storageKey);
  const stats = await fs.stat(filePath);
  const total = stats.size;
  const baseHeaders: Record<string, string> = {
    "Content-Type": mimeType || "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  if (rangeHeader) {
    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
      if (start <= end && start < total) {
        const stream = createReadStream(filePath, { start, end });
        return {
          stream: Readable.toWeb(stream) as ReadableStream,
          status: 206,
          headers: {
            ...baseHeaders,
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Content-Length": String(end - start + 1),
          },
        };
      }
    }
  }

  return {
    stream: Readable.toWeb(createReadStream(filePath)) as ReadableStream,
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(total) },
  };
}
