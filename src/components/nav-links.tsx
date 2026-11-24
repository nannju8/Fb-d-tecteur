"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/components/ui";

const ITEMS: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: "/", label: "Accès & vue d'ensemble", short: "Accès", icon: "vault" },
  { href: "/collecte", label: "Collecte contrôlée", short: "Collecte", icon: "download" },
  { href: "/bibliotheque", label: "Bibliothèque", short: "Coffre", icon: "library" },
  { href: "/reels", label: "Lecteur Reels", short: "Reels", icon: "play" },
  { href: "/blueprint", label: "Plan technique", short: "Plan", icon: "blueprint" },
];

export function NavLinks({ variant }: { variant: "rail" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "bottom") {
    return (
      <nav className="grid grid-cols-5 gap-1">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition",
                active ? "text-brand-soft" : "text-muted hover:text-cream",
              )}
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-xl border transition",
                  active
                    ? "border-brand/40 bg-brand/15 text-brand-soft"
                    : "border-transparent bg-transparent",
                )}
              >
                <Icon name={item.icon} size={18} />
              </span>
              {item.short}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1.5">
      {ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition",
              active
                ? "border-brand/35 bg-brand/12 text-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "border-transparent text-muted hover:border-line/70 hover:bg-panel/60 hover:text-cream",
            )}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-xl border transition",
                active
                  ? "border-brand/40 bg-brand/20 text-brand-soft"
                  : "border-line/70 bg-panel/70 text-muted group-hover:text-cream",
              )}
            >
              <Icon name={item.icon} size={16} />
            </span>
            <span className="flex-1">{item.label}</span>
            {active ? <span className="size-1.5 rounded-full bg-brand-soft" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
