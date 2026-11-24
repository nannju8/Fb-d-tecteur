import { AppFrame } from "@/components/app-frame";
import { LockedNotice } from "@/components/locked-notice";
import { ReelsFeed } from "@/components/reels/reels-feed";
import { Badge } from "@/components/ui";
import {
  ensureSeeded,
  getActiveSession,
  getLibrary,
  getStats,
} from "@/lib/vault";

export const dynamic = "force-dynamic";

export default async function ReelsPage({
  searchParams,
}: {
  searchParams: Promise<{ clip?: string }>;
}) {
  await ensureSeeded();
  const { clip } = await searchParams;
  const session = await getActiveSession();
  const [clips, stats] = await Promise.all([getLibrary(), getStats()]);
  const startId = clip ? Number(clip) : undefined;

  return (
    <AppFrame session={session} stats={stats} immersive={Boolean(session)}>
      {session ? (
        <div className="mx-auto w-full max-w-[1180px] px-3 py-4 sm:px-6 sm:py-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-soft">
                Lecteur Reels
              </div>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-cream sm:text-xl">
                Flux personnel, lecture locale
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="mint" icon="offline">
                {stats.localClips} hors ligne
              </Badge>
              <Badge tone="neutral" icon="film">
                {stats.totalClips} vidéos
              </Badge>
            </div>
          </div>
          <ReelsFeed clips={clips} startId={startId} />
        </div>
      ) : (
        <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6">
          <LockedNotice section="Lecteur Reels" />
        </div>
      )}
    </AppFrame>
  );
}
