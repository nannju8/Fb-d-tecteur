"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Badge, Card, EmptyState, cn } from "@/components/ui";
import { formatBytes, formatCount, formatDuration, formatRelative } from "@/lib/format";
import { GUARDRAILS } from "@/lib/guardrails";
import type { ClipDTO, VaultStats } from "@/lib/types";

type Props = { clips: ClipDTO[]; stats: VaultStats };

type Filter = "all" | "local" | "streaming" | "favorite";
type CatalogItem = {
  key: string;
  title: string;
  author: string;
  caption: string;
  remoteUrl: string;
  durationSeconds: number;
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "local", label: "Hors ligne" },
  { key: "streaming", label: "Streaming" },
  { key: "favorite", label: "Favoris" },
];

export function LibraryBoard({ clips, stats }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "mint" | "rose" | "brand"; text: string } | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((tone: "mint" | "rose" | "brand", text: string) => {
    setNotice({ tone, text });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotice(null), 5000);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clips
      .filter((clip) => {
        if (filter === "local" && !clip.hasLocalFile) return false;
        if (filter === "streaming" && clip.hasLocalFile) return false;
        if (filter === "favorite" && !clip.favorite) return false;
        if (!needle) return true;
        return (
          clip.title.toLowerCase().includes(needle) ||
          clip.author.toLowerCase().includes(needle) ||
          clip.caption.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.id - a.id);
  }, [clips, filter, query]);

  async function cacheClip(clip: ClipDTO) {
    setBusyId(clip.id);
    try {
      const response = await fetch(`/api/clips/${clip.id}/cache`, { method: "POST" });
      const data = (await response.json()) as { error?: string; detail?: string };
      if (!response.ok) {
        notify("rose", data.error ?? "Mise hors ligne impossible.");
      } else {
        notify("mint", `« ${clip.title} » est maintenant disponible 100 % hors ligne.`);
        router.refresh();
      }
    } catch {
      notify("rose", "Réseau indisponible : la mise hors ligne a échoué.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFavorite(clip: ClipDTO) {
    setBusyId(clip.id);
    try {
      const response = await fetch(`/api/clips/${clip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: !clip.favorite }),
      });
      if (response.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function removeClip(clip: ClipDTO) {
    if (!window.confirm(`Supprimer « ${clip.title} » du coffre privé ?`)) return;
    setBusyId(clip.id);
    try {
      const response = await fetch(`/api/clips/${clip.id}`, { method: "DELETE" });
      if (response.ok) {
        notify("brand", `« ${clip.title} » et son fichier local ont été supprimés.`);
        router.refresh();
      } else {
        notify("rose", "Suppression impossible.");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="grid gap-4 border-b border-line/60 bg-gradient-to-br from-brand/10 via-transparent to-mint/5 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
              <Icon name="library" size={13} />
              Stockage privé
            </div>
            <h2 className="mt-1 text-lg font-semibold text-cream">
              {stats.totalClips} vidéo{stats.totalClips === 1 ? "" : "s"} indexée
              {stats.localClips === stats.totalClips && stats.totalClips > 0
                ? "s, toutes hors ligne"
                : ""}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {stats.localClips} fichier(s) dans <span className="font-mono">filesDir</span> ·{" "}
              {formatBytes(stats.storageBytes)} · {stats.watchedClips} déjà vue(s) ·{" "}
              {stats.favoriteClips} favori(s)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-indigo-400 px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              <Icon name="upload" size={15} />
              Importer une vidéo
            </button>
            <Link
              href="/reels"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-xs font-medium text-cream transition hover:border-brand/40"
            >
              <Icon name="play" size={15} />
              Lire le flux
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto">
            {FILTERS.map((item) => {
              const count =
                item.key === "all"
                  ? clips.length
                  : item.key === "local"
                    ? clips.filter((clip) => clip.hasLocalFile).length
                    : item.key === "streaming"
                      ? clips.filter((clip) => !clip.hasLocalFile).length
                      : clips.filter((clip) => clip.favorite).length;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition",
                    filter === item.key
                      ? "border-brand/45 bg-brand/15 text-cream"
                      : "border-line bg-panel/60 text-muted hover:text-cream",
                  )}
                >
                  {item.label}
                  <span className="rounded-full bg-void/60 px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <label className="relative flex items-center">
            <Icon
              name="search"
              size={15}
              className="pointer-events-none absolute left-3 text-muted"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un titre, un auteur…"
              className="w-full rounded-xl border border-line bg-void/60 py-2 pl-9 pr-3 text-xs text-cream placeholder:text-muted/60 focus:border-brand/60 focus:outline-none sm:w-64"
            />
          </label>
        </div>
      </Card>

      {notice ? (
        <div
          className={cn(
            "animate-fade-up rounded-2xl border px-4 py-3 text-xs",
            notice.tone === "mint" && "border-mint/30 bg-mint/10 text-mint",
            notice.tone === "rose" && "border-rose/30 bg-rose/10 text-rose",
            notice.tone === "brand" && "border-brand/35 bg-brand/10 text-brand-soft",
          )}
        >
          {notice.text}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon="library"
          title={
            clips.length === 0 ? "Le coffre est vide" : "Aucune vidéo pour ce filtre"
          }
          description={
            clips.length === 0
              ? "Lancez une petite session de collecte ou importez un fichier vidéo pour commencer votre bibliothèque hors ligne."
              : "Changez de filtre ou effacez la recherche pour retrouver vos vidéos."
          }
          action={
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link
                href="/collecte"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white"
              >
                <Icon name="download" size={14} />
                Ouvrir une session
              </Link>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-xs font-medium text-cream"
              >
                <Icon name="upload" size={14} />
                Importer un fichier
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((clip) => (
            <Card
              key={clip.id}
              className="group overflow-hidden transition hover:border-brand/35"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                {clip.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={clip.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div
                    className="size-full"
                    style={{
                      background: `radial-gradient(circle at 30% 20%, ${clip.accent}66, transparent 60%), linear-gradient(150deg, #101422, ${clip.accent}33)`,
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/25 to-transparent" />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                  <div className="flex flex-col gap-1.5">
                    <Badge tone={clip.hasLocalFile ? "mint" : "amber"} icon={clip.hasLocalFile ? "offline" : "online"}>
                      {clip.hasLocalFile ? "Local" : "Streaming"}
                    </Badge>
                    {clip.origin === "manual" ? (
                      <Badge tone="cream" icon="upload">
                        Import
                      </Badge>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(clip)}
                    disabled={busyId === clip.id}
                    className={cn(
                      "grid size-8 place-items-center rounded-full border backdrop-blur transition",
                      clip.favorite
                        ? "border-rose/50 bg-rose/20 text-rose"
                        : "border-white/15 bg-void/50 text-white/80 hover:text-white",
                    )}
                    aria-label="Basculer favori"
                  >
                    <Icon name="heart" size={15} />
                  </button>
                </div>

                <Link
                  href={`/reels?clip=${clip.id}`}
                  className="absolute inset-0 grid place-items-center"
                  aria-label={`Lire ${clip.title}`}
                >
                  <span className="grid size-14 place-items-center rounded-full border border-white/20 bg-void/60 text-white backdrop-blur transition group-hover:scale-105 group-hover:bg-brand/70">
                    <Icon name="play" size={22} />
                  </span>
                </Link>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
                  <span className="rounded-lg border border-white/10 bg-void/70 px-2 py-1 font-mono text-[10px] text-white/85 backdrop-blur">
                    {clip.hasLocalFile ? formatBytes(clip.sizeBytes) : "flux source"}
                  </span>
                  <span className="rounded-lg border border-white/10 bg-void/70 px-2 py-1 font-mono text-[10px] text-white/85 backdrop-blur">
                    {formatDuration(clip.durationSeconds)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <h3 className="line-clamp-1 text-sm font-semibold text-cream">
                    {clip.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {clip.author} · {formatRelative(clip.createdAt)}
                  </p>
                  {clip.caption ? (
                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted/85">
                      {clip.caption}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-1 border-t border-line/60 pt-2.5">
                  <span className="flex items-center gap-3 text-[10px] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="heart" size={11} />
                      {formatCount(clip.likeCount)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="comment" size={11} />
                      {formatCount(clip.commentCount)}
                    </span>
                    {clip.watched ? (
                      <span className="inline-flex items-center gap-1 text-mint">
                        <Icon name="eye" size={11} />
                        vue
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-1">
                    {!clip.hasLocalFile ? (
                      <button
                        type="button"
                        onClick={() => cacheClip(clip)}
                        disabled={busyId === clip.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-[10px] font-medium text-muted transition hover:border-mint/40 hover:text-mint disabled:opacity-50"
                        title="Copier dans le stockage privé"
                      >
                        <Icon
                          name={busyId === clip.id ? "refresh" : "download"}
                          size={12}
                          className={busyId === clip.id ? "animate-spin" : undefined}
                        />
                        {busyId === clip.id ? "Copie" : "Hors ligne"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeClip(clip)}
                      disabled={busyId === clip.id}
                      className="grid size-7 place-items-center rounded-lg border border-transparent text-muted transition hover:border-rose/40 hover:text-rose disabled:opacity-50"
                      aria-label="Supprimer"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                    <Link
                      href={`/reels?clip=${clip.id}`}
                      className="grid size-7 place-items-center rounded-lg border border-transparent text-muted transition hover:border-brand/40 hover:text-brand-soft"
                      aria-label="Ouvrir dans le lecteur"
                    >
                      <Icon name="arrowRight" size={13} />
                    </Link>
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted/70">
        Capacité du coffre : {clips.length}/{GUARDRAILS.maxLibraryClips} vidéos. Les
        fichiers restent dans le stockage privé et ne sont jamais exposés dans une
        galerie publique.
      </p>

      {importOpen ? (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImported={(message, tone) => {
            setImportOpen(false);
            notify(tone, message);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (message: string, tone: "mint" | "rose" | "brand") => void;
}) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [caption, setCaption] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/catalog")
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data: { items?: CatalogItem[] }) => {
        if (active) setCatalog(data.items ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function pickFile(next: File | null) {
    setFile(next);
    setError(null);
    if (!next) {
      setDuration(0);
      return;
    }
    if (!title) setTitle(next.name.replace(/\.[a-z0-9]+$/i, ""));
    const url = URL.createObjectURL(next);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      URL.revokeObjectURL(url);
    };
    video.onerror = () => URL.revokeObjectURL(url);
    video.src = url;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "file" && !file) {
      setError("Choisissez un fichier vidéo à copier dans le coffre.");
      return;
    }
    if (mode === "link" && !sourceUrl.trim()) {
      setError("Collez un lien direct vers un fichier vidéo.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      if (mode === "file" && file) form.append("file", file);
      form.append("title", title);
      form.append("author", author);
      form.append("caption", caption);
      form.append("sourceUrl", mode === "link" ? sourceUrl.trim() : "");
      form.append("duration", String(Math.round(duration)));

      const response = await fetch("/api/clips", { method: "POST", body: form });
      const data = (await response.json()) as { error?: string; detail?: string };
      if (!response.ok) {
        setError([data.error, data.detail].filter(Boolean).join(" — "));
        return;
      }
      onImported(
        mode === "file"
          ? `« ${title || file?.name} » copiée dans le stockage privé.`
          : `Lien média ajouté à la bibliothèque.`,
        "mint",
      );
    } catch {
      setError("Import impossible : vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-void/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="animate-fade-up max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-4xl border border-line bg-panel p-5 shadow-2xl sm:rounded-4xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-cream">Ajout manuel</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Le chemin de repli fiable : un fichier déjà présent sur l&apos;appareil
              ou un lien direct vers un média autorisé.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg border border-line text-muted transition hover:text-cream"
            aria-label="Fermer"
          >
            <Icon name="x" size={15} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-void/50 p-1">
          {(
            [
              { key: "file", label: "Fichier local", icon: "upload" },
              { key: "link", label: "Lien direct", icon: "link" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMode(option.key)}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition",
                mode === option.key
                  ? "bg-brand/18 text-cream shadow-[inset_0_0_0_1px_rgba(91,124,250,0.35)]"
                  : "text-muted hover:text-cream",
              )}
            >
              <Icon name={option.icon} size={14} />
              {option.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          {mode === "file" ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-void/40 px-4 py-7 text-center transition hover:border-brand/50"
              >
                <span className="grid size-10 place-items-center rounded-xl border border-line bg-panel-2 text-brand-soft">
                  <Icon name="upload" size={18} />
                </span>
                <span className="text-xs font-medium text-cream">
                  {file ? file.name : "Choisir une vidéo (MP4, WebM, MOV)"}
                </span>
                <span className="text-[10px] text-muted">
                  {file
                    ? `${formatBytes(file.size)} · ${formatDuration(duration)}`
                    : `Maximum ${GUARDRAILS.maxFileBytes / 1024 / 1024} Mo`}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
                  URL directe du média
                </span>
                <input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://…/video.mp4"
                  className="w-full rounded-xl border border-line bg-void/60 px-3.5 py-2.5 font-mono text-xs text-cream placeholder:text-muted/50 focus:border-brand/60 focus:outline-none"
                />
              </label>
              {catalog.length > 0 ? (
                <div className="rounded-xl border border-line/70 bg-void/30 p-2.5">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                    Sources de démonstration
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {catalog.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setSourceUrl(item.remoteUrl);
                          setTitle(item.title);
                          setAuthor(item.author);
                          setCaption(item.caption);
                          setDuration(item.durationSeconds);
                        }}
                        className="rounded-full border border-line bg-panel px-2.5 py-1 text-[10px] text-muted transition hover:border-brand/40 hover:text-cream"
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
                Titre
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                placeholder="Titre personnel"
                className="w-full rounded-xl border border-line bg-void/60 px-3.5 py-2.5 text-xs text-cream placeholder:text-muted/50 focus:border-brand/60 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
                Auteur / source
              </span>
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                maxLength={80}
                placeholder="Import local"
                className="w-full rounded-xl border border-line bg-void/60 px-3.5 py-2.5 text-xs text-cream placeholder:text-muted/50 focus:border-brand/60 focus:outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
              Note de publication
            </span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={600}
              rows={2}
              placeholder="Pourquoi garder cette vidéo ?"
              className="w-full resize-none rounded-xl border border-line bg-void/60 px-3.5 py-2.5 text-xs text-cream placeholder:text-muted/50 focus:border-brand/60 focus:outline-none"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[11px] leading-relaxed text-rose">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2.5 text-xs font-medium text-muted transition hover:text-cream"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-indigo-400 px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              <Icon name={busy ? "refresh" : "download"} size={14} className={busy ? "animate-spin" : undefined} />
              {busy ? "Import en cours…" : "Ajouter au coffre"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
