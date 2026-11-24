import { getActiveSession } from "@/lib/vault";
import type { SessionDTO } from "@/lib/types";

export function jsonError(
  error: string,
  status = 400,
  detail?: string,
): Response {
  return Response.json({ error, detail }, { status });
}

export async function requireSession(): Promise<
  { session: SessionDTO; response?: never } | { session?: never; response: Response }
> {
  const session = await getActiveSession();
  if (!session) {
    return {
      response: jsonError(
        "Coffre verrouillé : connectez une session d'accès pour continuer.",
        423,
      ),
    };
  }
  return { session };
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function clampInt(value: unknown, min: number, max: number): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export function maskId(value: string): string {
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}
