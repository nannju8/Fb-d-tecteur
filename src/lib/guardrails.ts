/**
 * Central guardrail configuration.
 * The exact same numbers are intended to be copied into the Android client
 * (`Guardrails.kt`) so the web console and the app never diverge.
 */
export const GUARDRAILS = {
  /** Smallest useful batch. */
  targetMin: 5,
  /** Hard ceiling for a single session. Never raised by the client. */
  targetMax: 15,
  /** Random pause window between two items of a batch. */
  minDelayMs: 2400,
  maxDelayMs: 6200,
  /** Minimum server-enforced spacing between two worker ticks. */
  minTickSpacingMs: 1400,
  /** Cooldown after a run ends (completed or aborted). */
  cooldownMs: 45_000,
  /** Progressive risk: after this many successful items, a challenge can occur. */
  challengeAfter: 8,
  challengeProbability: 0.09,
  transientFailureProbability: 0.08,
  /** Vault ceiling — keeps storage bounded and avoids bulk hoarding. */
  maxLibraryClips: 120,
  /** Max accepted size for a manual import / cached file (bytes). */
  maxFileBytes: 120 * 1024 * 1024,
  allowedDomains: ["facebook.com", "fbcdn.net"] as const,
} as const;

export const ALLOWED_DOMAINS = GUARDRAILS.allowedDomains;

export function clampTarget(value: unknown): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return GUARDRAILS.targetMin;
  return Math.min(GUARDRAILS.targetMax, Math.max(GUARDRAILS.targetMin, parsed));
}

export function randomDelayMs(): number {
  const { minDelayMs, maxDelayMs } = GUARDRAILS;
  return Math.round(minDelayMs + Math.random() * (maxDelayMs - minDelayMs));
}

/** Hostname allow-list check used by the manual import validation. */
export function isAllowedDomain(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}
