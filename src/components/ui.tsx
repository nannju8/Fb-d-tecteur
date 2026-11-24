import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "rounded-3xl border border-line/80 bg-panel/70 shadow-[0_30px_80px_-60px_rgba(0,0,0,1)] backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

const badgeTones = {
  brand: "border-brand/35 bg-brand/12 text-brand-soft",
  mint: "border-mint/30 bg-mint/10 text-mint",
  amber: "border-amber/30 bg-amber/10 text-amber",
  rose: "border-rose/30 bg-rose/10 text-rose",
  neutral: "border-line bg-panel-2/80 text-muted",
  cream: "border-cream/20 bg-cream/10 text-cream",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: IconName;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
        badgeTones[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? (
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-soft">
            {icon ? <Icon name={icon} size={13} /> : null}
            {eyebrow}
          </div>
        ) : null}
        <h2 className="text-balance text-xl font-semibold tracking-tight text-cream sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  accent?: "brand" | "mint" | "amber" | "rose";
}) {
  const accents = {
    brand: "text-brand-soft bg-brand/12 border-brand/25",
    mint: "text-mint bg-mint/10 border-mint/25",
    amber: "text-amber bg-amber/10 border-amber/25",
    rose: "text-rose bg-rose/10 border-rose/25",
  } as const;

  return (
    <div className="rounded-2xl border border-line/70 bg-panel/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        <span className={cn("rounded-xl border p-1.5", accents[accent])}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-cream">{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "brand",
  className,
  label,
}: {
  value: number;
  max: number;
  tone?: "brand" | "mint" | "amber" | "rose";
  className?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const tones = {
    brand: "bg-gradient-to-r from-brand to-brand-soft",
    mint: "bg-gradient-to-r from-mint to-emerald-300",
    amber: "bg-gradient-to-r from-amber to-orange-300",
    rose: "bg-gradient-to-r from-rose to-pink-400",
  } as const;

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>{label}</span>
          <span className="tabular-nums">{Math.round(pct)} %</span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/70">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", tones[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  icon = "film",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line bg-panel/40 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl border border-line bg-panel-2 text-brand-soft">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="text-base font-semibold text-cream">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function CodeBlock({ code, filename }: { code: string; filename?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line/80 bg-[#070a12]">
      <div className="flex items-center justify-between border-b border-line/60 bg-panel/60 px-4 py-2.5">
        <span className="font-mono text-[11px] text-muted">{filename ?? "snippet"}</span>
        <span className="flex gap-1.5">
          <span className="size-2 rounded-full bg-rose/70" />
          <span className="size-2 rounded-full bg-amber/70" />
          <span className="size-2 rounded-full bg-mint/70" />
        </span>
      </div>
      <pre className="hide-scrollbar overflow-x-auto p-4 text-[12px] leading-relaxed text-[#c9d4ea]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/50 py-2.5 text-sm last:border-none">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-cream">{value}</span>
    </div>
  );
}
