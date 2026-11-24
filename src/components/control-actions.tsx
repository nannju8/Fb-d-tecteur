"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { cn } from "@/components/ui";

export function LockButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function lock() {
    setBusy(true);
    try {
      await fetch("/api/access", { method: "DELETE" });
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={lock}
      disabled={busy || pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-line bg-panel/80 px-3 py-2 text-xs font-medium text-muted transition hover:border-rose/40 hover:text-rose disabled:opacity-50",
        compact && "px-2 py-1.5",
      )}
      title="Verrouiller le coffre et révoquer la session"
    >
      <Icon name="lock" size={14} />
      {compact ? null : busy || pending ? "Verrouillage…" : "Verrouiller"}
    </button>
  );
}

export function OnlineBadge() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        online
          ? "border-mint/25 bg-mint/10 text-mint"
          : "border-amber/30 bg-amber/10 text-amber",
      )}
    >
      <Icon name={online ? "online" : "offline"} size={12} />
      {online ? "En ligne" : "Hors ligne"}
    </span>
  );
}
