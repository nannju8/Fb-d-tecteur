import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { NavLinks } from "@/components/nav-links";
import { LockButton, OnlineBadge } from "@/components/control-actions";
import { Badge, cn } from "@/components/ui";
import type { SessionDTO, VaultStats } from "@/lib/types";
import { formatBytes } from "@/lib/format";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="relative grid size-10 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-indigo-500 to-[#31d6b4] text-white shadow-[0_12px_30px_-12px_rgba(91,124,250,0.9)]">
        <span className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_30%_20%,#fff,transparent_55%)]" />
        <Icon name="vault" size={20} className="relative" />
      </span>
      {compact ? null : (
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-[0.16em] text-cream">
            VAULT
          </span>
          <span className="block text-[11px] text-muted">reels hors ligne</span>
        </span>
      )}
    </Link>
  );
}

export function AppFrame({
  children,
  session,
  stats,
  immersive = false,
}: {
  children: ReactNode;
  session: SessionDTO | null;
  stats?: VaultStats;
  immersive?: boolean;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line/60 bg-ink/70 px-5 py-6 backdrop-blur lg:flex">
        <Brand />

        <div className="mt-6">
          <NavLinks variant="rail" />
        </div>

        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-line/80 bg-panel/70 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Coffre privé
              </span>
              <Badge tone={session ? "mint" : "amber"} icon={session ? "unlock" : "lock"}>
                {session ? "Ouvert" : "Verrouillé"}
              </Badge>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Vidéos</dt>
                <dd className="font-medium text-cream">{stats?.totalClips ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Fichiers locaux</dt>
                <dd className="font-medium text-cream">{stats?.localClips ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Stockage</dt>
                <dd className="font-medium text-cream">
                  {formatBytes(stats?.storageBytes ?? 0)}
                </dd>
              </div>
            </dl>
          </div>
          <p className="px-1 text-[10px] leading-relaxed text-muted/70">
            Prototype web du plan Android — aucune extraction de réseau social, aucun
            identifiant stocké.
          </p>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-line/60 bg-void/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <Badge tone={session ? "brand" : "neutral"} icon="shield">
                Périmètre facebook.com · fbcdn.net
              </Badge>
              <OnlineBadge />
            </div>
            <div className="flex items-center gap-2">
              {session ? (
                <>
                  <span className="hidden items-center gap-2 rounded-xl border border-line bg-panel/70 px-3 py-2 text-xs text-muted sm:flex">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-2 animate-pulse-dot rounded-full bg-mint" />
                      <span className="relative inline-flex size-2 rounded-full bg-mint" />
                    </span>
                    {session.accountLabel}
                  </span>
                  <LockButton />
                </>
              ) : (
                <Badge tone="amber" icon="lock">
                  Session requise
                </Badge>
              )}
            </div>
          </div>
        </header>

        <main
          className={cn(
            "flex-1 pb-24 lg:pb-8",
            immersive ? "" : "mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8",
          )}
        >
          {children}
        </main>

        <footer
          className={cn(
            "hidden border-t border-line/50 px-6 py-4 text-[11px] text-muted/70 lg:flex lg:items-center lg:justify-between",
          )}
        >
          <span>Vault · console de collecte et stockage privé</span>
          <span className="flex items-center gap-2">
            <Icon name="shield" size={12} />
            Lots de 5 à 15 · pause obligatoire entre sessions
          </span>
        </footer>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <NavLinks variant="bottom" />
      </div>
    </div>
  );
}
