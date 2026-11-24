// Populates the private demo vault with a few licensed stock clips so the
// offline library is usable immediately. Files land in .data/vault, never in a
// public directory. Safe to re-run: existing files are skipped.
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCES = [
  {
    file: "demo-neon-street.mp4",
    url: "https://videos.pexels.com/video-files/7114935/7114935-hd_1080_1920_24fps.mp4",
  },
  {
    file: "demo-chinatown.mp4",
    url: "https://videos.pexels.com/video-files/7062344/7062344-hd_1080_1920_24fps.mp4",
  },
  {
    file: "demo-skate-line.mp4",
    url: "https://videos.pexels.com/video-files/4863215/4863215-hd_1066_1920_25fps.mp4",
  },
  {
    file: "demo-asphalt.mp4",
    url: "https://videos.pexels.com/video-files/8609014/8609014-hd_1080_1920_25fps.mp4",
  },
];

const dir = path.join(process.cwd(), ".data", "vault");

async function existingSize(file) {
  try {
    const info = await stat(path.join(dir, file));
    return info.size;
  } catch {
    return 0;
  }
}

await mkdir(dir, { recursive: true });

for (const source of SOURCES) {
  const size = await existingSize(source.file);
  if (size > 1024) {
    console.log(`skip ${source.file} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    continue;
  }
  process.stdout.write(`fetch ${source.file} … `);
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "OfflineVault/1.0 (setup)" },
      signal: AbortSignal.timeout(150_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(path.join(dir, source.file), buffer);
    console.log(`${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (error) {
    console.log(`failed (${error.message}) — the clip will stay streamable`);
  }
}
