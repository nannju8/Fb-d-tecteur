import { DEMO_CATALOG } from "@/lib/catalog";
import { requireSession } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Direct media samples offered in the manual import panel. */
export async function GET() {
  const gate = await requireSession();
  if (gate.response) return gate.response;

  return Response.json({
    items: DEMO_CATALOG.slice(0, 6).map((item) => ({
      key: item.key,
      title: item.title,
      author: item.author,
      caption: item.caption,
      remoteUrl: item.remoteUrl,
      thumbnailUrl: item.thumbnailUrl,
      durationSeconds: item.durationSeconds,
      accent: item.accent,
    })),
  });
}
