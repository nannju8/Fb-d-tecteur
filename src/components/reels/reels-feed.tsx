"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Badge, cn } from "@/components/ui";
import { formatBytes, formatCount, formatDuration, formatRelative } from "@/lib/format";
import type { ClipDTO } from "@/lib/types";

type Props = { clips: ClipDTO[]; startId?: number };

export function ReelsFeed({ clips, startId }: Props) {
  const items = clips;
  const initialIndex = useMemo(() => {
    const index = items.findIndex((clip) => clip.id === startId);
    return index >= 0 ? index : 0;
  }, [items, startId]);

  const [active, setActive] = useState(initialIndex);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [itemsState, setItemsState] = useState(items);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showChrome, setShowChrome] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const activeRef = useRef(active);
  const lastSaveRef = useRef(0);
  const resumedRef = useRef<Set<number>>(new Set());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = itemsState[active];

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    setItemsState(items);
  }, [items]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const saveProgress = useCallback((clipId: number, position: number, watched: boolean) => {
    const payload: Record<string, number | boolean> = { watchPosition: position };
    if (watched) payload.watched = true;
    void fetch(`/api/clips/${clipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  // Play the active slide, pause the others.
  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      if (id !== current?.id) video.pause();
    });
    const video = current ? videoRefs.current.get(current.id) : null;
    if (!video) return;
    const stored = current.watchPosition;
    if (
      !resumedRef.current.has(current.id) &&
      stored > 2 &&
      Number.isFinite(video.duration) &&
      video.duration > stored + 2
    ) {
      video.currentTime = stored;
      resumedRef.current.add(current.id);
    }
    if (playing) {
      void video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }, [active, current, playing]);

  useEffect(() => {
    if (!current) return;
    const video = videoRefs.current.get(current.id);
    if (video) video.muted = muted;
  }, [muted, current]);

  // Track the slide in view.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const slides = Array.from(container.querySelectorAll<HTMLElement>("[data-slide-index]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
            const index = Number((entry.target as HTMLElement).dataset.slideIndex);
            if (Number.isFinite(index)) {
              setActive(index);
              setPlaying(true);
            }
          }
        });
      },
      { root: container, threshold: [0.55, 0.85] },
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [itemsState.length]);

  const goTo = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      const clamped = Math.max(0, Math.min(itemsState.length - 1, index));
      const slide = container.querySelector<HTMLElement>(
        `[data-slide-index="${clamped}"]`,
      );
      if (slide) {
        container.scrollTo({ top: slide.offsetTop, behavior: "smooth" });
        setActive(clamped);
        setPlaying(true);
      }
    },
    [itemsState.length],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        goTo(activeRef.current + 1);
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        goTo(activeRef.current - 1);
      } else if (event.key === " ") {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (event.key.toLowerCase() === "m") {
        setMuted((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo]);

  // Persist progress when leaving the page.
  useEffect(() => {
    return () => {
      const clip = items[activeRef.current];
      const video = clip ? videoRefs.current.get(clip.id) : null;
      if (clip && video && video.currentTime > 0) {
        saveProgress(clip.id, video.currentTime, video.currentTime > clip.durationSeconds * 0.5);
      }
    };
  }, [items, saveProgress]);

  async function toggleFavorite(clip: ClipDTO) {
    const next = !clip.favorite;
    setItemsState((state) =>
      state.map((item) => (item.id === clip.id ? { ...item, favorite: next } : item)),
    );
    const response = await fetch(`/api/clips/${clip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: next }),
    }).catch(() => null);
    if (!response?.ok) {
      setItemsState((state) =>
        state.map((item) => (item.id === clip.id ? { ...item, favorite: !next } : item)),
      );
      notify("Impossible d'enregistrer le favori.");
    }
  }

  async function cacheClip(clip: ClipDTO) {
    setBusyId(clip.id);
    try {
      const response = await fetch(`/api/clips/${clip.id}/cache`, { method: "POST" });
      const data = (await response.json()) as {
        error?: string;
        clip?: ClipDTO;
      };
      if (!response.ok || !data.clip) {
        notify(data.error ?? "Mise hors ligne impossible.");
        return;
      }
      setItemsState((state) =>
        state.map((item) => (item.id === clip.id ? data.clip ?? item : item)),
      );
      notify("Vidéo copiée dans le stockage privé : lecture hors ligne garantie.");
    } finally {
      setBusyId(null);
    }
  }

  function togglePlay() {
    const video = current ? videoRefs.current.get(current.id) : null;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function seek(value: number) {
    const video = current ? videoRefs.current.get(current.id) : null;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  }

  if (itemsState.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-3xl border border-line bg-panel text-brand-soft">
          <Icon name="film" size={26} />
        </span>
        <h2 className="text-lg font-semibold text-cream">Rien à lire pour le moment</h2>
        <p className="text-sm leading-relaxed text-muted">
          Votre flux hors ligne est vide. Lancez une session de collecte ou importez
          un fichier vidéo pour commencer.
        </p>
        <div className="flex gap-2">
          <Link
            href="/collecte"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white"
          >
            <Icon name="download" size={14} />
            Collecter
          </Link>
          <Link
            href="/bibliotheque"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-xs font-medium text-cream"
          >
            <Icon name="upload" size={14} />
            Importer
          </Link>
        </div>
      </div>
    );
  }

  const localCount = itemsState.filter((clip) => clip.hasLocalFile).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="relative mx-auto w-full max-w-[460px]">
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.75rem] bg-gradient-to-b from-brand/20 via-transparent to-mint/10 blur-2xl" />
        <div className="relative overflow-hidden rounded-[2rem] border border-line/80 bg-black shadow-[0_40px_100px_-40px_rgba(0,0,0,1)]">
          <div
            ref={containerRef}
            className="reels-feed hide-scrollbar relative h-[calc(100dvh-10.5rem)] snap-y overflow-y-auto bg-black lg:h-[calc(100dvh-9rem)]"
          >
            {itemsState.map((clip, index) => {
              const isActive = index === active;
              return (
                <section
                  key={clip.id}
                  data-slide-index={index}
                  className="reels-slide relative flex h-full w-full items-center justify-center overflow-hidden bg-black"
                >
                  {clip.thumbnailUrl ? (
                    <div
                      className="absolute inset-0 scale-110 opacity-40 blur-2xl"
                      style={{
                        backgroundImage: `url(${clip.thumbnailUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 opacity-50"
                      style={{
                        background: `radial-gradient(circle at 40% 20%, ${clip.accent}66, transparent 65%)`,
                      }}
                    />
                  )}

                  {isActive ? (
                    <video
                      ref={(node) => {
                        if (node) videoRefs.current.set(clip.id, node);
                        else videoRefs.current.delete(clip.id);
                      }}
                      src={`/api/media/${clip.id}`}
                      poster={clip.thumbnailUrl ?? undefined}
                      playsInline
                      loop
                      muted={muted}
                      autoPlay={playing}
                      preload="metadata"
                      onClick={() => setShowChrome((value) => !value)}
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                      onLoadedMetadata={(event) => {
                        const video = event.currentTarget;
                        setDuration(video.duration || clip.durationSeconds);
                        if (!clip.hasLocalFile && clip.durationSeconds === 0) {
                          void fetch(`/api/clips/${clip.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ durationSeconds: Math.round(video.duration) }),
                          }).catch(() => undefined);
                        }
                      }}
                      onTimeUpdate={(event) => {
                        const video = event.currentTarget;
                        setCurrentTime(video.currentTime);
                        const now = Date.now();
                        if (now - lastSaveRef.current > 5000 && video.currentTime > 1) {
                          lastSaveRef.current = now;
                          saveProgress(
                            clip.id,
                            video.currentTime,
                            video.currentTime > (video.duration || 1) * 0.55,
                          );
                        }
                      }}
                      className="relative z-10 h-full w-full object-contain"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => goTo(index)}
                      className="relative z-10 h-full w-full"
                      aria-label={`Lire ${clip.title}`}
                    >
                      {clip.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={clip.thumbnailUrl}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </button>
                  )}

                  <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-transparent to-black/55" />

                  <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-4">
                    <Badge
                      tone={clip.hasLocalFile ? "mint" : "amber"}
                      icon={clip.hasLocalFile ? "offline" : "online"}
                      className="backdrop-blur"
                    >
                      {clip.hasLocalFile ? "Fichier local" : "Flux source"}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMuted((value) => !value)}
                        className="grid size-8 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
                        aria-label={muted ? "Activer le son" : "Couper le son"}
                      >
                        <Icon name={muted ? "volumeOff" : "volume"} size={15} />
                      </button>
                      <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 font-mono text-[10px] text-white/85 backdrop-blur">
                        {index + 1} / {itemsState.length}
                      </span>
                    </div>
                  </div>

                  {!playing && isActive ? (
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="absolute inset-0 z-30 grid place-items-center"
                      aria-label="Lire"
                    >
                      <span className="grid size-16 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur">
                        <Icon name="play" size={26} />
                      </span>
                    </button>
                  ) : null}

                  {muted && isActive ? (
                    <button
                      type="button"
                      onClick={() => setMuted(false)}
                      className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 translate-y-14 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[10px] font-medium text-white backdrop-blur transition hover:bg-black/80"
                    >
                      Activer le son
                    </button>
                  ) : null}

                  {showChrome ? (
                    <>
                      <div className="absolute bottom-24 right-3 z-30 flex flex-col items-center gap-4 text-white sm:bottom-28">
                        <ActionButton
                          icon="heart"
                          label={formatCount(clip.likeCount)}
                          active={clip.favorite}
                          onClick={() => toggleFavorite(clip)}
                        />
                        <ActionButton
                          icon="comment"
                          label={formatCount(clip.commentCount)}
                          disabled
                          title="Compteur d'origine, non modifiable"
                        />
                        <ActionButton
                          icon={busyId === clip.id ? "refresh" : "bookmark"}
                          label={clip.hasLocalFile ? "local" : "hors-ligne"}
                          onClick={() => cacheClip(clip)}
                          busy={busyId === clip.id}
                        />
                        <ActionButton
                          icon="library"
                          label="coffre"
                          onClick={() => {
                            window.location.href = "/bibliotheque";
                          }}
                        />
                      </div>

                      <div className="absolute inset-x-0 bottom-0 z-30 space-y-3 bg-gradient-to-t from-black/80 to-transparent p-4 pb-5">
                        <div className="flex items-center gap-2">
                          <span
                            className="grid size-7 place-items-center rounded-full border border-white/20 text-[10px] font-semibold text-white"
                            style={{ background: `${clip.accent}44` }}
                          >
                            {clip.author.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {clip.author}
                          </span>
                          <span className="text-[10px] text-white/60">
                            · {clip.hasLocalFile ? formatBytes(clip.sizeBytes) : "non mis en cache"}
                          </span>
                        </div>
                        <h2 className="text-sm font-semibold leading-snug text-white">
                          {clip.title}
                        </h2>
                        {clip.caption ? (
                          <p className="line-clamp-2 text-[11px] leading-relaxed text-white/75">
                            {clip.caption}
                          </p>
                        ) : null}
                        <p className="flex items-center gap-1.5 text-[10px] text-white/70">
                          <Icon name="music" size={11} />
                          {clip.origin === "manual" ? "Import personnel" : "Collecte contrôlée"}
                          {clip.runId ? ` · session #${clip.runId}` : ""}
                        </p>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] tabular-nums text-white/70">
                            {formatDuration(currentTime)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={Math.max(duration || clip.durationSeconds || 1, 0.1)}
                            step={0.1}
                            value={Math.min(currentTime, duration || clip.durationSeconds || 1)}
                            onChange={(event) => seek(Number(event.target.value))}
                            className="vault-range w-full"
                            aria-label="Progression"
                          />
                          <span className="font-mono text-[10px] tabular-nums text-white/70">
                            {formatDuration(duration || clip.durationSeconds)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : null}
                </section>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-line/70 bg-panel/80 px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted">
              <span className="flex gap-0.5">
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-3 w-1 rounded-full",
                      index <= active % 4 ? "bg-brand-soft" : "bg-line",
                    )}
                  />
                ))}
              </span>
              Lecture locale
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goTo(active - 1)}
                disabled={active === 0}
                className="grid size-8 place-items-center rounded-lg border border-line text-muted transition hover:text-cream disabled:opacity-35"
                aria-label="Vidéo précédente"
              >
                <Icon name="arrowUp" size={14} />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="grid size-8 place-items-center rounded-lg border border-line text-cream transition hover:border-brand/40"
                aria-label={playing ? "Pause" : "Lecture"}
              >
                <Icon name={playing ? "pause" : "play"} size={14} />
              </button>
              <button
                type="button"
                onClick={() => goTo(active + 1)}
                disabled={active >= itemsState.length - 1}
                className="grid size-8 place-items-center rounded-lg border border-line text-muted transition hover:text-cream disabled:opacity-35"
                aria-label="Vidéo suivante"
              >
                <Icon name="arrowDown" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside className="hidden space-y-4 lg:block">
        <div className="rounded-3xl border border-line/80 bg-panel/70 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mint">
            <Icon name="offline" size={13} />
            Visionnage hors connexion
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {localCount}/{itemsState.length} vidéos sont des fichiers locaux. Les autres
            se lisent via le flux source et peuvent être copiées d&apos;un geste.
          </p>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Fichiers privés</dt>
              <dd className="font-medium text-cream">{localCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Progression</dt>
              <dd className="font-medium text-cream">
                {formatDuration(currentTime)} / {formatDuration(duration || current?.durationSeconds || 0)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Vue</dt>
              <dd className="font-medium text-cream">
                {current?.watched ? "oui" : "en cours"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-line/80 bg-panel/70 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            <Icon name="film" size={13} />
            File de lecture
          </div>
          <div className="hide-scrollbar mt-3 max-h-[360px] space-y-1.5 overflow-y-auto">
            {itemsState.map((clip, index) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => goTo(index)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border px-2 py-2 text-left transition",
                  index === active
                    ? "border-brand/40 bg-brand/12"
                    : "border-transparent hover:border-line hover:bg-panel-2/60",
                )}
              >
                <span
                  className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-line/70 text-[10px] text-white/80"
                  style={{
                    background: clip.thumbnailUrl
                      ? `url(${clip.thumbnailUrl}) center/cover`
                      : `${clip.accent}55`,
                  }}
                >
                  {clip.thumbnailUrl ? "" : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-cream">
                    {clip.title}
                  </span>
                  <span className="block truncate text-[10px] text-muted">
                    {formatDuration(clip.durationSeconds)} ·{" "}
                    {clip.hasLocalFile ? "local" : "streaming"} ·{" "}
                    {formatRelative(clip.createdAt)}
                  </span>
                </span>
                {index === active ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-brand-soft" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-line/80 bg-panel/70 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            <Icon name="sliders" size={13} />
            Raccourcis
          </div>
          <ul className="mt-2.5 space-y-1.5 text-[11px] text-muted">
            <li className="flex justify-between"><span>Vidéo suivante</span><kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px]">↓</kbd></li>
            <li className="flex justify-between"><span>Vidéo précédente</span><kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px]">↑</kbd></li>
            <li className="flex justify-between"><span>Lecture / pause</span><kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px]">espace</kbd></li>
            <li className="flex justify-between"><span>Couper le son</span><kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px]">M</kbd></li>
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-muted/70">
            Les positions de lecture sont enregistrées et reprises automatiquement
            à la prochaine ouverture.
          </p>
        </div>
      </aside>

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border border-brand/40 bg-panel/95 px-4 py-3 text-center text-xs text-cream shadow-2xl backdrop-blur sm:bottom-8">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  active = false,
  onClick,
  busy = false,
  disabled = false,
  title,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  active?: boolean;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex flex-col items-center gap-1 text-white transition",
        disabled ? "cursor-default opacity-70" : "hover:scale-105",
      )}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full border backdrop-blur",
          active
            ? "border-rose/60 bg-rose/25 text-rose"
            : "border-white/20 bg-black/40 text-white",
        )}
      >
        <Icon
          name={icon}
          size={18}
          className={busy ? "animate-spin" : undefined}
          fill={active ? "currentColor" : "none"}
        />
      </span>
      <span className="text-[9px] font-medium text-white/85">{label}</span>
    </button>
  );
}
