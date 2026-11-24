import Link from "next/link";
import { ConnectForm } from "@/components/access/connect-form";
import { AppFrame } from "@/components/app-frame";
import { Icon, type IconName } from "@/components/icons";
import { LockButton } from "@/components/control-actions";
import { Badge, Card, KeyValue, ProgressBar, SectionHeading, StatCard } from "@/components/ui";
import { GUARDRAILS } from "@/lib/guardrails";
import { formatBytes, formatDateTime, formatRelative } from "@/lib/format";
import {
  cooldownRemaining,
  ensureSeeded,
  getActiveSession,
  getRecentEvents,
  getRuns,
  getStats,
} from "@/lib/vault";

export const dynamic = "force-dynamic";

const PRINCIPLES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "shield",
    title: "Accès borné",
    text: "Une seule porte d'entrée, un marqueur de session local révocable et un périmètre limité à facebook.com et fbcdn.net.",
  },
  {
    icon: "sliders",
    title: "Petits lots progressifs",
    text: "5 à 15 vidéos par session, pauses aléatoires, plafond serveur et arrêt immédiat au moindre signal de vérification.",
  },
  {
    icon: "database",
    title: "Stockage privé",
    text: "Les fichiers sont isolés, indexés en base et servis uniquement via le coffre déverrouillé. Jamais de galerie publique.",
  },
];

const PIPELINE = [
  { step: "01", title: "Session", text: "c_user détecté, domaine borné", icon: "lock" as IconName },
  { step: "02", title: "Lot", text: "5–15 entrées, pauses aléatoires", icon: "sliders" as IconName },
  { step: "03", title: "Worker", text: "copie séquentielle dans filesDir", icon: "download" as IconName },
  { step: "04", title: "Lecture", text: "flux vertical, reprise, 0 réseau", icon: "play" as IconName },
];

export default async function HomePage() {
  await ensureSeeded();
  const session = await getActiveSession();
  const [stats, events, runs, cooldown] = await Promise.all([
    getStats(),
    getRecentEvents(6),
    getRuns(3),
    cooldownRemaining(),
  ]);

  const lastRun = runs[0];

  return (
    <AppFrame session={session} stats={stats}>
      {!session ? (
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
            <section className="relative overflow-hidden rounded-5xl border border-line/70 bg-ink/40 p-6 sm:p-8">
              <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-70" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand" icon="vault">
                    Prototype fonctionnel du brief Android
                  </Badge>
                  <Badge tone="mint" icon="shield">
                    Zéro scraping
                  </Badge>
                </div>
                <h1 className="text-balance mt-5 text-3xl font-semibold leading-[1.08] tracking-tight text-cream sm:text-4xl">
                  Vos Reels préférés,
                  <span className="block bg-gradient-to-r from-brand-soft via-cream to-mint bg-clip-text text-transparent">
                    hors ligne et sous contrôle.
                  </span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
                  Un coffre personnel inspiré des codes de lecture verticaux, sans
                  copier l&apos;interface d&apos;un réseau social. Session verrouillée,
                  lots volontairement modestes, fichiers isolés et lecteur hors
                  connexion : le parcours complet est ici exécutable.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { value: `${GUARDRAILS.targetMin}–${GUARDRAILS.targetMax}`, label: "vidéos / session" },
                    { value: `${GUARDRAILS.cooldownMs / 1000} s`, label: "pause obligatoire" },
                    { value: "filesDir", label: "stockage isolé" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-line/70 bg-panel/50 px-3.5 py-3"
                    >
                      <div className="text-lg font-semibold tracking-tight text-cream">
                        {item.value}
                      </div>
                      <div className="text-[11px] text-muted">{item.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <a
                    href="#connexion"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-indigo-400 px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    <Icon name="unlock" size={15} />
                    Ouvrir une session locale
                  </a>
                  <Link
                    href="/blueprint"
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel/70 px-4 py-2.5 text-xs font-medium text-cream transition hover:border-brand/40"
                  >
                    <Icon name="blueprint" size={15} />
                    Lire le plan technique
                  </Link>
                </div>

                <div className="mt-7 space-y-2.5">
                  {[
                    "Connexion locale révocable, aucun identifiant Facebook conservé",
                    "Collecte prudente + import manuel comme chemin de repli",
                    "Lecteur vertical avec reprise de lecture et cache par fichier",
                  ].map((line) => (
                    <p key={line} className="flex items-start gap-2 text-xs text-muted">
                      <Icon name="check" size={14} className="mt-0.5 text-mint" />
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <div className="space-y-4">
              <ConnectForm />
              <Card className="p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  <Icon name="info" size={12} />
                  Ce que ce prototype assume
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  Le collecteur s&apos;alimente d&apos;un catalogue de démonstration
                  sous licence. L&apos;extraction automatisée de Reels n&apos;est pas
                  implémentée : elle dépend de sessions, de flux adaptatifs et des
                  conditions d&apos;utilisation du réseau. L&apos;import fichier/lien
                  direct reste le chemin fiable pour vos propres médias.
                </p>
              </Card>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <Card key={principle.title} className="p-5">
                <span className="grid size-9 place-items-center rounded-xl border border-line bg-panel-2 text-brand-soft">
                  <Icon name={principle.icon} size={16} />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-cream">{principle.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{principle.text}</p>
              </Card>
            ))}
          </section>

          <Card className="overflow-hidden">
            <div className="border-b border-line/60 px-5 py-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
                <Icon name="blueprint" size={13} />
                Parcours verrouillé
              </div>
            </div>
            <div className="grid gap-px bg-line/50 sm:grid-cols-2 lg:grid-cols-4">
              {PIPELINE.map((item) => (
                <div key={item.step} className="bg-panel/60 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">{item.step}</span>
                    <Icon name={item.icon} size={15} className="text-brand-soft" />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-cream">{item.title}</div>
                  <div className="mt-1 text-[11px] text-muted">{item.text}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-5xl border border-line/70 bg-ink/50 p-6 sm:p-7">
            <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="mint" icon="unlock">
                    Coffre ouvert
                  </Badge>
                  <Badge tone="brand" icon="clock">
                    {cooldown > 0 ? `pause ${cooldown} s` : "prêt pour un nouveau lot"}
                  </Badge>
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                  Bienvenue, {session.accountLabel}.
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {stats.totalClips === 0
                    ? "Le coffre est vide : commencez par une session courte de 5 à 10 vidéos, ou importez un fichier local."
                    : `${stats.localClips} vidéo(s) sont déjà lisibles sans réseau, sur ${stats.totalClips} indexées.`}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href="/collecte"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-indigo-400 px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    <Icon name="download" size={15} />
                    Nouvelle session courte
                  </Link>
                  <Link
                    href="/reels"
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-xs font-medium text-cream transition hover:border-brand/40"
                  >
                    <Icon name="play" size={15} />
                    Reprendre le flux
                  </Link>
                  <Link
                    href="/bibliotheque"
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-xs font-medium text-cream transition hover:border-brand/40"
                  >
                    <Icon name="upload" size={15} />
                    Importer
                  </Link>
                </div>
              </div>
              <div className="w-full max-w-xs rounded-3xl border border-line/80 bg-panel/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Session active
                  </span>
                  <LockButton compact />
                </div>
                <div className="mt-2 space-y-0.5">
                  <KeyValue label="Profil" value={session.accountLabel} />
                  <KeyValue
                    label="c_user"
                    value={<span className="font-mono text-xs">{session.cUserId.slice(0, 2)}••••{session.cUserId.slice(-2)}</span>}
                  />
                  <KeyValue label="Ouverte" value={formatRelative(session.connectedAt)} />
                  <KeyValue
                    label="Périmètre"
                    value={<span className="font-mono text-[10px]">facebook.com · fbcdn.net</span>}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Vidéos"
              value={String(stats.totalClips)}
              hint={`${stats.watchedClips} déjà vues`}
              icon="film"
            />
            <StatCard
              label="Hors ligne"
              value={`${stats.localClips}`}
              hint={`${stats.streamedClips} en streaming`}
              icon="offline"
              accent="mint"
            />
            <StatCard
              label="Stockage privé"
              value={formatBytes(stats.storageBytes)}
              hint={`plafond ${GUARDRAILS.maxLibraryClips} vidéos`}
              icon="database"
              accent="amber"
            />
            <StatCard
              label="Sessions"
              value={String(stats.totalRuns)}
              hint={
                stats.lastRunAt ? `dernière ${formatRelative(stats.lastRunAt)}` : "aucune encore"
              }
              icon="clock"
              accent="rose"
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <Card className="p-5">
              <SectionHeading
                eyebrow="Garde-fous"
                title="Le volume est une décision serveur, pas un curseur libre"
                description="Ces limites sont appliquées dans les routes API et devront l'être à l'identique dans le worker Android."
                icon="shield"
                action={<Badge tone="mint" icon="check">actifs</Badge>}
              />
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
                    <span>Lot autorisé par session</span>
                    <span className="font-mono">{GUARDRAILS.targetMin}–{GUARDRAILS.targetMax}</span>
                  </div>
                  <ProgressBar value={GUARDRAILS.targetMax} max={20} tone="brand" />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
                    <span>Capacité du coffre</span>
                    <span className="font-mono">{stats.totalClips}/{GUARDRAILS.maxLibraryClips}</span>
                  </div>
                  <ProgressBar value={stats.totalClips} max={GUARDRAILS.maxLibraryClips} tone="mint" />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
                    <span>Pause entre sessions</span>
                    <span className="font-mono">{GUARDRAILS.cooldownMs / 1000} s</span>
                  </div>
                  <ProgressBar value={cooldown} max={GUARDRAILS.cooldownMs / 1000} tone="amber" />
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {[
                  { icon: "clock" as IconName, label: `Pauses ${GUARDRAILS.minDelayMs / 1000}–${GUARDRAILS.maxDelayMs / 1000} s` },
                  { icon: "alert" as IconName, label: "Arrêt sur défi détecté" },
                  { icon: "database" as IconName, label: `Fichier ≤ ${GUARDRAILS.maxFileBytes / 1024 / 1024} Mo` },
                  { icon: "offline" as IconName, label: "Lecture sans réseau" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-xl border border-line/60 bg-void/40 px-3 py-2 text-[11px] text-muted"
                  >
                    <Icon name={item.icon} size={13} className="text-brand-soft" />
                    {item.label}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <SectionHeading
                eyebrow="Activité"
                title="Derniers événements"
                icon="clock"
                action={
                  <Link href="/collecte" className="text-[11px] text-brand-soft hover:underline">
                    tout voir
                  </Link>
                }
              />
              <div className="mt-4 space-y-2.5">
                {events.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
                    Aucun événement pour le moment.
                  </p>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="flex gap-2.5">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border border-line bg-panel-2 text-muted">
                        <Icon
                          name={
                            event.kind.includes("fail") || event.kind.includes("abort")
                              ? "alert"
                              : event.kind.includes("cache") || event.kind.includes("ok")
                                ? "check"
                                : event.kind.includes("session")
                                  ? "lock"
                                  : "info"
                          }
                          size={12}
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] leading-relaxed text-cream/90">{event.message}</p>
                        <p className="mt-0.5 text-[10px] text-muted/70">
                          {formatRelative(event.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="p-5">
              <SectionHeading eyebrow="Historique" title="Sessions de collecte" icon="download" />
              <div className="mt-4 space-y-2">
                {runs.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
                    Aucune session ouverte pour l&apos;instant.
                  </p>
                ) : (
                  runs.map((run) => (
                    <div
                      key={run.id}
                      className="rounded-2xl border border-line/60 bg-void/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-cream">
                          Session #{run.id}
                        </span>
                        <Badge
                          tone={
                            run.status === "completed"
                              ? "mint"
                              : run.status === "aborted"
                                ? "rose"
                                : "brand"
                          }
                        >
                          {run.status === "completed"
                            ? "terminée"
                            : run.status === "aborted"
                              ? "interrompue"
                              : "en cours"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[10px] text-muted">
                        {run.targetCount} demandées · {run.succeeded} prêtes · {run.failed} échec(s) ·{" "}
                        {formatDateTime(run.startedAt)}
                      </p>
                      <ProgressBar
                        className="mt-2"
                        value={run.processed}
                        max={run.targetCount}
                        tone={run.status === "aborted" ? "rose" : "brand"}
                      />
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-line/60 bg-gradient-to-br from-brand/10 to-transparent px-5 py-4">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
                    <Icon name="blueprint" size={13} />
                    Correspondance Android
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-cream">
                    Du WebView verrouillé au VerticalPager Media3
                  </h3>
                </div>
                <Link
                  href="/blueprint"
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:text-cream"
                  aria-label="Ouvrir le plan"
                >
                  <Icon name="arrowRight" size={14} />
                </Link>
              </div>
              <div className="space-y-2 px-5 py-4">
                {[
                  { web: "Session locale", android: "CookieManager + c_user dans le WebView borné", icon: "lock" as IconName },
                  { web: "PostgreSQL + Drizzle", android: "Room (ClipEntity, CollectRun, EventEntity)", icon: "database" as IconName },
                  { web: "Worker tick HTTP", android: "WorkManager, contrainte réseau, backoff", icon: "download" as IconName },
                  { web: "Flux vertical HTML", android: "VerticalPager + ExoPlayer, reprise locale", icon: "play" as IconName },
                ].map((row) => (
                  <div
                    key={row.web}
                    className="flex items-center gap-3 rounded-xl border border-line/60 bg-void/40 px-3 py-2.5"
                  >
                    <Icon name={row.icon} size={14} className="shrink-0 text-brand-soft" />
                    <div className="min-w-0 text-[11px]">
                      <span className="font-medium text-cream">{row.web}</span>
                      <span className="mx-1.5 text-muted/50">→</span>
                      <span className="text-muted">{row.android}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {lastRun ? (
            <p className="text-[11px] text-muted/70">
              Dernière session : #{lastRun.id}, {lastRun.status}, démarrée{" "}
              {formatRelative(lastRun.startedAt)}.{" "}
              {lastRun.abortReason ? `Motif d'arrêt : ${lastRun.abortReason}` : ""}
            </p>
          ) : null}
        </div>
      )}
    </AppFrame>
  );
}
