"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

export function CopyBrief({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-indigo-400 px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
    >
      <Icon name={state === "copied" ? "check" : "blueprint"} size={14} />
      {state === "copied"
        ? "Brief copié"
        : state === "error"
          ? "Copie impossible"
          : "Copier le brief Android"}
    </button>
  );
}
