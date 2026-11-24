"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { Badge, Card, ProgressBar, cn } from "@/components/ui";
import { GUARDRAILS } from "@/lib/guardrails";
import { formatRelative } from "@/lib/format";
import type { EventDTO, RunDTO } from "@/lib/types";

type Props = {
  initialRun: RunDTO | null;
  initialCooldown: number;
  initialEvents: EventDTO[];
};

type TickResponse = {
  run: RunDTO;
  item?: { clipId: number; title: string; outcome: "ready" | "failed" };
  autoCache?: boolean;
  done?: boolean;
  aborted?: boolean;
  nextDelayMs?: number;
  events?: EventDTO[];
  error?: string;
  retryAfterMs?: number;
};

type LogEntry = {
  key: string;
  message: string;
  kind: string;
  tone: "brand" | "mint" | "amber" | "rose" | "neutral";
  at: number;
};

const PRESETS = [5, 8, 10, 12, 15];

function toneForKind(kind: string): LogEntry["tone"] {
  if (kind.includes("fail") || kind.includes("abort") || kind.includes("challenge"))
    return "rose";
  if (kind.includes("cache_ok") || kind.includes("completed") || kind.includes("fetch_ok"))
    return "mint";
  if (kind.includes("pause") || kind.includes("guardrail")) return "amber";
  if (kind.includes("started") || kind.includes("ready")) return "brand";
  return "neutral";
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function CollectConsole({ initialRun, initialCooldown, initialEvents }: Props) {
  const router = useRouter();
  const [target, setTarget] = useState(8);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "aborted" | "error">(
    initialRun ? "running" : "idle",
  );
  const [run, setRun] = useState<RunDTO | null>(initialRun);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [workerActive, setWorkerActive] = useState(false);
  const [autoCache, setAutoCache] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [cacheNote, setCacheNote] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    initialEvents.slice(0, 8).map((event, index) => ({
      key: `seed-${event.id}-${index}`,
      message: event.message,
      kind: event.kind,
      tone: toneForKind(event.kind),
      at: new Date(event.createdAt).getTime(),
    })),
  );

  const cancelRef = useRef(false);
  const loopRef = useRef(false);
  const autoCacheRef = useRef(autoCache);
  const counterRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    autoCacheRef.current = autoCache;
  }, [autoCache]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const pushLog = useCallback((kind: string, message: string) => {
    counterRef.current += 1;
    const entry: LogEntry = {
      key: `log-${counterRef.current}`,
      message,
      kind,
      tone: toneForKind(kind),
      at: Date.now(),
    };
    setLogs((current) => [entry, ...current].slice(0, 40));
  }, []);

  const loop = useCallback(
    async (runId: number) => {
      if (loopRef.current) return;
      loopRef.current = true;
      cancelRef.current = false;
      setWorkerActive(true);

      try {
        while (!cancelRef.current && mountedRef.current) {
          const response = await fetch("/api/collect/tick", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId }),
          });
          const data = (await response.json()) as TickResponse;

          if (response.status === 429) {
            const wait = data.retryAfterMs ?? 1600;
            pushLog("guardrail", data.error ?? "Cadence limitée, pause imposée.");
            await sleep(wait);
            continue;
          }

          if (!response.ok) {
            setError(data.error ?? "Le collecteur a rencontré une erreur.");
            setPhase("error");
            break;
          }

          if (mountedRef.current) {
            setRun(data.run);
            for (const event of data.events ?? []) {
              if (event.kind !== "pause") {
                pushLog(event.kind, event.message);
              }
            }
          }

          if (data.item) {
            pushLog(
              data.item.outcome === "ready" ? "item_ready" : "item_failed",
              data.item.outcome === "ready"
                ? `✓ ${data.item.title} ajoutée à la bibliothèque`
                : `✕ ${data.item.title} — entrée ignorée`,
            );
          }

          if (
            autoCacheRef.current &&
            data.item?.outcome === "ready" &&
            data.autoCache
          ) {
            setCacheNote(`Copie de « ${data.item.title} » dans filesDir…`);
            pushLog("cache_start", `Mise hors ligne de « ${data.item.title} »…`);
            try {
              const cacheResponse = await fetch(
                `/api/clips/${data.item.clipId}/cache`,
                { method: "POST" },
              );
              const cacheData = (await cacheResponse.json()) as {
                error?: string;
                detail?: string;
              };
              pushLog(
                cacheResponse.ok ? "cache_ok" : "cache_failed",
                cacheResponse.ok
                  ? `Fichier local prêt : « ${data.item.title} »`
                  : `Streaming conservé : ${cacheData.error ?? "échec de la copie locale"}`,
              );
            } catch {
              pushLog("cache_failed", "Copie locale interrompue, streaming conservé.");
            } finally {
              setCacheNote(null);
            }
          }

          if (!mountedRef.current) break;

          if (data.aborted) {
            setPhase("aborted");
            setCooldown(GUARDRAILS.cooldownMs / 1000);
            pushLog(
              "challenge_detected",
              data.run.abortReason ??
                "Défi de sécurité : le lot a été interrompu immédiatement.",
            );
            break;
          }

          if (data.done) {
            setPhase("done");
            setCooldown(GUARDRAILS.cooldownMs / 1000);
            pushLog(
              "run_completed",
              `Session terminée : ${data.run.succeeded} vidéo(s) indexée(s), ${data.run.failed} échec(s).`,
            );
            break;
          }

          const wait = data.nextDelayMs ?? 3200;
          setCountdown(Math.ceil(wait / 1000));
          await sleep(wait);
          setCountdown(0);
        }
      } catch {
        if (mountedRef.current) {
          setError("Connexion interrompue avec le worker. Réessayez la session.");
          setPhase("error");
        }
      } finally {
        loopRef.current = false;
        if (mountedRef.current) {
          setWorkerActive(false);
          setCountdown(0);
          setCacheNote(null);
          router.refresh();
        }
      }
    },
    [pushLog, router],
  );

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/collect/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = (await response.json()) as {
        run?: RunDTO;
        error?: string;
        retryAfter?: number;
        clamped?: boolean;
      };
      if (!response.ok || !data.run) {
        setError(data.error ?? "Impossible d'ouvrir la session.");
        if (data.retryAfter) setCooldown(data.retryAfter);
        return;
      }
      setRun(data.run);
      setPhase("running");
      setLogs([]);
      pushLog(
        "run_started",
        `Session #${data.run.id} ouverte : ${data.run.targetCount} vidéos, pauses ${(
          data.run.minDelayMs / 1000
        ).toFixed(1)}–${(data.run.maxDelayMs / 1000).toFixed(1)} s.`,
      );
      if (data.clamped) {
        pushLog("guardrail", "Quantité ramenée au plafond serveur de 15 vidéos.");
      }
      void loop(data.run.id);
    } catch {
      setError("Réseau indisponible : la session n'a pas pu démarrer.");
    } finally {
      setBusy(false);
    }
  }

  async function abort() {
    if (!run) return;
    cancelRef.current = true;
    setWorkerActive(false);
    try {
      await fetch("/api/collect/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: run.id }),
      });
      setPhase("aborted");
      setCooldown(GUARDRAILS.cooldownMs / 1000);
      pushLog("run_aborted", "Arrêt manuel : aucune requête supplémentaire envoyée.");
      router.refresh();
    } catch {
      setError("Impossible d'interrompre proprement la session.");
    }
  }

  function resume() {
    if (!run) return;
    setPhase("running");
    setError(null);
    pushLog("run_resumed", `Reprise prudente de la session #${run.id}.`);
    void loop(run.id);
  }

  const progress = useMemo(() => {
    if (!run) return { value: 0, max: target };
    return { value: run.processed, max: run.targetCount };
  }, [run, target]);

  const statusLabel = {
    idle: "Prêt à ouvrir une session",
    running: "Collecte en cours",
    done: "Session terminée",
    aborted: "Session interrompue",
    error: "Erreur du worker",
  }[phase];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="border-b border-line/60 bg-gradient-to-br from-brand/12 via-transparent to-transparent px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
                  <Icon name="download" size={13} />
                  Collecte par petits lots
                </div>
                <h2 className="mt-1 text-lg font-semibold text-cream">
                  Une session = 5 à 15 vidéos, puis une pause obligatoire
                </h2>
              </div>
              <Badge
                tone={
                  phase === "running"
                    ? "mint"
                    : phase === "aborted"
                      ? "rose"
                      : phase === "done"
                        ? "brand"
                        : "neutral"
                }
                icon={
                  phase === "running"
                    ? "refresh"
                    : phase === "done"
                      ? "check"
                      : phase === "aborted"
                        ? "alert"
                        : "clock"
                }
              >
                {statusLabel}
              </Badge>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div>
              <div className="flex items-end justify-between gap-3">
                <label
                  htmlFor="target-count"
                  className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted"
                >
                  Quantité demandée
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTarget((value) => Math.max(GUARDRAILS.targetMin, value - 1))}
                    disabled={phase === "running"}
                    className="grid size-8 place-items-center rounded-lg border border-line bg-panel-2 text-muted transition hover:text-cream disabled:opacity-40"
                    aria-label="Diminuer"
                  >
                    <span className="text-lg leading-none">−</span>
                  </button>
                  <span className="w-14 text-center text-2xl font-semibold tabular-nums text-cream">
                    {target}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTarget((value) => Math.min(GUARDRAILS.targetMax, value + 1))}
                    disabled={phase === "running"}
                    className="grid size-8 place-items-center rounded-lg border border-line bg-panel-2 text-muted transition hover:text-cream disabled:opacity-40"
                    aria-label="Augmenter"
                  >
                    <Icon name="plus" size={15} />
                  </button>
                </div>
              </div>
              <input
                id="target-count"
                type="range"
                min={GUARDRAILS.targetMin}
                max={GUARDRAILS.targetMax}
                value={target}
                disabled={phase === "running"}
                onChange={(event) => setTarget(Number(event.target.value))}
                className="vault-range mt-3 w-full accent-brand"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTarget(preset)}
                    disabled={phase === "running"}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-medium transition disabled:opacity-40",
                      target === preset
                        ? "border-brand/45 bg-brand/15 text-cream"
                        : "border-line bg-panel/60 text-muted hover:text-cream",
                    )}
                  >
                    {preset} vidéos
                  </button>
                ))}
                <span className="ml-auto self-center text-[11px] text-muted">
                  Plafond serveur : {GUARDRAILS.targetMax}
                </span>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line/70 bg-void/40 p-3.5">
              <input
                type="checkbox"
                checked={autoCache}
                onChange={(event) => setAutoCache(event.target.checked)}
                className="mt-0.5 size-4 accent-brand"
              />
              <span>
                <span className="block text-xs font-medium text-cream">
                  Copier chaque fichier dans le stockage privé avant l&apos;entrée suivante
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                  Équivalent WorkManager : téléchargement séquentiel, aucune rafale,
                  échec = streaming conservé.
                </span>
              </span>
            </label>

            {run ? (
              <div className="space-y-3 rounded-2xl border border-line/70 bg-panel-2/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-cream">
                    Session #{run.id}
                  </span>
                  <span className="text-[11px] text-muted">
                    {run.processed}/{run.targetCount} traitées · {run.succeeded} prêtes ·{" "}
                    {run.failed} échec(s)
                  </span>
                </div>
                <ProgressBar
                  value={progress.value}
                  max={progress.max}
                  tone={phase === "aborted" ? "rose" : phase === "done" ? "mint" : "brand"}
                />
                {phase === "running" ? (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="eq-bar h-3 w-1 rounded-full bg-brand-soft"
                          style={{ animationDelay: `${index * 0.15}s` }}
                        />
                      ))}
                    </span>
                    {cacheNote
                      ? cacheNote
                      : countdown > 0
                        ? `Pause ${countdown} s avant l'entrée suivante…`
                        : "Préparation de la prochaine entrée…"}
                  </div>
                ) : null}
                {run.abortReason ? (
                  <p className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[11px] leading-relaxed text-rose">
                    {run.abortReason}
                  </p>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-amber">
                {error}
              </p>
            ) : null}

            {cooldown > 0 && phase !== "running" ? (
              <p className="flex items-center gap-2 rounded-xl border border-line bg-void/50 px-3 py-2 text-[11px] text-muted">
                <Icon name="clock" size={13} className="text-amber" />
                Pause de sécurité : nouvelle session possible dans {cooldown} s.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {run && run.status === "running" && !workerActive ? (
                <button
                  type="button"
                  onClick={resume}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  <Icon name="refresh" size={15} />
                  Reprendre le worker
                </button>
              ) : null}
              {!workerActive && phase !== "running" && run?.status !== "running" ? (
                <button
                  type="button"
                  onClick={start}
                  disabled={busy || cooldown > 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-indigo-400 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_14px_36px_-18px_rgba(91,124,250,0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="download" size={15} />
                  {busy ? "Ouverture…" : "Ouvrir la session contrôlée"}
                </button>
              ) : null}
              {workerActive ? (
                <button
                  type="button"
                  onClick={abort}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose/40 bg-rose/12 px-4 py-2.5 text-xs font-semibold text-rose transition hover:bg-rose/20"
                >
                  <Icon name="pause" size={15} />
                  Interrompre maintenant
                </button>
              ) : null}
              {phase === "done" || phase === "aborted" ? (
                <>
                  <Link
                    href="/bibliotheque"
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-xs font-medium text-cream transition hover:border-brand/40"
                  >
                    <Icon name="library" size={15} />
                    Voir le coffre
                  </Link>
                  <Link
                    href="/reels"
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-xs font-medium text-cream transition hover:border-brand/40"
                  >
                    <Icon name="play" size={15} />
                    Lire hors ligne
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-cream">Journal du worker</h3>
            <Badge tone="neutral" icon="clock">
              temps réel
            </Badge>
          </div>
          <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
                Aucun événement pour le moment. Ouvrez une session pour voir les
                pauses et les décisions du collecteur.
              </p>
            ) : (
              logs.map((entry) => (
                <div
                  key={entry.key}
                  className="animate-fade-up flex items-start gap-2.5 rounded-xl border border-line/50 bg-void/40 px-3 py-2.5"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border",
                      entry.tone === "mint" && "border-mint/30 bg-mint/10 text-mint",
                      entry.tone === "rose" && "border-rose/30 bg-rose/10 text-rose",
                      entry.tone === "amber" && "border-amber/30 bg-amber/10 text-amber",
                      entry.tone === "brand" && "border-brand/30 bg-brand/10 text-brand-soft",
                      entry.tone === "neutral" && "border-line bg-panel text-muted",
                    )}
                  >
                    <Icon
                      name={
                        entry.tone === "mint"
                          ? "check"
                          : entry.tone === "rose"
                            ? "alert"
                            : entry.tone === "amber"
                              ? "clock"
                              : ("info" as IconName)
                      }
                      size={11}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-relaxed text-cream/90">
                      {entry.message}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted/70">
                      {formatRelative(new Date(entry.at).toISOString())} · {entry.kind}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mint">
            <Icon name="shield" size={13} />
            Garde-fous actifs
          </div>
          <ul className="mt-3 space-y-3 text-xs">
            {[
              {
                icon: "sliders" as IconName,
                title: "Lot borné côté serveur",
                text: `${GUARDRAILS.targetMin} à ${GUARDRAILS.targetMax} vidéos. Une valeur supérieure est ramenée au plafond, sans erreur silencieuse.`,
              },
              {
                icon: "clock" as IconName,
                title: "Pauses aléatoires",
                text: `${GUARDRAILS.minDelayMs / 1000} à ${GUARDRAILS.maxDelayMs / 1000} s entre deux entrées, plus un espacement minimum contrôlé par l'API.`,
              },
              {
                icon: "alert" as IconName,
                title: "Arrêt sur défi",
                text: "Un signal de vérification interrompt tout le lot. Aucun contournement, aucune relance automatique.",
              },
              {
                icon: "battery" as IconName,
                title: "Pause entre sessions",
                text: `${GUARDRAILS.cooldownMs / 1000} s obligatoires après une session, même interrompue.`,
              },
              {
                icon: "database" as IconName,
                title: "Coffre borné",
                text: `${GUARDRAILS.maxLibraryClips} vidéos maximum et ${GUARDRAILS.maxFileBytes / 1024 / 1024} Mo par fichier.`,
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-panel-2 text-muted">
                  <Icon name={item.icon} size={13} />
                </span>
                <span>
                  <span className="block font-medium text-cream">{item.title}</span>
                  <span className="mt-0.5 block leading-relaxed text-muted">
                    {item.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            <Icon name="refresh" size={13} />
            Déroulé d&apos;un tick
          </div>
          <ol className="mt-3 space-y-3">
            {[
              "Le worker réclame la prochaine entrée en file (jamais plus d'une à la fois).",
              "La pause aléatoire est respectée avant l'appel suivant.",
              "En cas de succès, le média rejoint le stockage privé puis la bibliothèque.",
              "Un défi ou une erreur répétée arrête le lot et laisse une trace dans le journal.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3 text-xs leading-relaxed text-muted">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-brand/30 bg-brand/10 font-mono text-[10px] text-brand-soft">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Card>

        <div className="rounded-3xl border border-amber/25 bg-amber/10 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber">
            <Icon name="info" size={13} />
            Périmètre volontaire
          </div>
          <p className="mt-2 text-xs leading-relaxed text-amber/90">
            Le collecteur de ce prototype consomme un catalogue de démonstration
            sous licence. Il ne contourne aucune protection d&apos;accès et
            n&apos;extrait rien d&apos;un réseau social : pour vos propres vidéos,
            utilisez l&apos;import fichier/lien direct depuis la bibliothèque.
          </p>
        </div>
      </div>
    </div>
  );
}
