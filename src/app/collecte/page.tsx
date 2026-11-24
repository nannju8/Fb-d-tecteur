import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { CollectConsole } from "@/components/collect/collect-console";
import { Icon } from "@/components/icons";
import { LockedNotice } from "@/components/locked-notice";
import { Badge, Card, ProgressBar, SectionHeading } from "@/components/ui";
import { GUARDRAILS } from "@/lib/guardrails";
import { formatDateTime } from "@/lib/format";
import {
  cooldownRemaining,
  ensureSeeded,
  getActiveSession,
  getRecentEvents,
  getRunningRun,
  getRuns,
  getStats,
} from "@/lib/vault";

export const dynamic = "force-dynamic";

export default async function CollectPage() {
  await ensureSeeded();
  const session = await getActiveSession();
  const [stats, runningRun, cooldown, events, runs] = await Promise.all([
    getStats(),
    getRunningRun(),
    cooldownRemaining(),
    getRecentEvents(10),
    getRuns(8),
  ]);

  return (
    <AppFrame session={session} stats={stats}>
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Collecte contrôlée"
          title="Un lot court, puis une vraie pause"
          description="Le worker traite une entrée à la fois, attend un délai aléatoire et s'arrête net si un signal de sécurité apparaît. Aucun contournement, aucune relance automatique."
          icon="download"
          action={
            session ? (
              <div className="flex flex-wrap gap-2">
                <Badge tone="mint" icon="shield">
                  {GUARDRAILS.targetMin}–{GUARDRAILS.targetMax} max
                </Badge>
                <Link
                  href="/blueprint"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-2 text-[11px] font-medium text-muted transition hover:text-cream"
                >
                  <Icon name="blueprint" size={13} />
                  Spécification worker
                </Link>
              </div>
            ) : undefined
          }
        />

        {session ? (
          <>
            <CollectConsole
              initialRun={runningRun}
              initialCooldown={cooldown}
              initialEvents={events}
            />

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line/60 px-5 py-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  <Icon name="database" size={13} />
                  Sessions récentes
                </div>
                <span className="text-[11px] text-muted">
                  {stats.totalRuns} session(s) au total
                </span>
              </div>
              <div className="divide-y divide-line/50">
                {runs.length === 0 ? (
                  <p className="px-5 py-8 text-center text-xs text-muted">
                    Aucune session enregistrée. La première ouvrira l&apos;historique.
                  </p>
                ) : (
                  runs.map((run) => (
                    <div key={run.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-cream">#{run.id}</span>
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
                          <span className="text-[11px] text-muted">
                            {formatDateTime(run.startedAt)}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted">
                          {run.succeeded}/{run.targetCount} prêtes · {run.failed} échec(s)
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <ProgressBar
                          value={run.processed}
                          max={run.targetCount}
                          tone={run.status === "aborted" ? "rose" : run.status === "completed" ? "mint" : "brand"}
                          className="flex-1"
                        />
                        <span className="font-mono text-[10px] text-muted">
                          {Math.round((run.processed / Math.max(1, run.targetCount)) * 100)}%
                        </span>
                      </div>
                      {run.abortReason ? (
                        <p className="mt-2 text-[11px] text-rose/90">{run.abortReason}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </>
        ) : (
          <LockedNotice section="Collecte" />
        )}
      </div>
    </AppFrame>
  );
}
