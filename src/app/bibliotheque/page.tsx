import { AppFrame } from "@/components/app-frame";
import { LibraryBoard } from "@/components/library/library-board";
import { LockedNotice } from "@/components/locked-notice";
import { SectionHeading } from "@/components/ui";
import {
  ensureSeeded,
  getActiveSession,
  getLibrary,
  getStats,
} from "@/lib/vault";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await ensureSeeded();
  const session = await getActiveSession();
  const [clips, stats] = await Promise.all([getLibrary(), getStats()]);

  return (
    <AppFrame session={session} stats={stats}>
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Coffre privé"
          title="Votre bibliothèque hors ligne"
          description="Chaque entrée conserve ses métadonnées et, si elle est copiée localement, son fichier dans le stockage privé. Le lecteur ne dépend du réseau que pour les vidéos encore en streaming."
          icon="library"
        />
        {session ? (
          <LibraryBoard clips={clips} stats={stats} />
        ) : (
          <LockedNotice section="Bibliothèque" />
        )}
      </div>
    </AppFrame>
  );
}
