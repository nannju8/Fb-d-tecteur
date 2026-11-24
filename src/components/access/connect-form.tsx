"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { GUARDRAILS } from "@/lib/guardrails";
import { cn } from "@/components/ui";

type Mode = "demo" | "cookie";

export function ConnectForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("demo");
  const [label, setLabel] = useState("Compte personnel");
  const [cookie, setCookie] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountLabel: label,
          cUserId: mode === "cookie" ? cookie.trim() : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string; detail?: string };
      if (!response.ok) {
        setError(data.error ?? "Connexion refusée.");
        return;
      }
      setOk(true);
      router.refresh();
    } catch {
      setError("Réseau indisponible : impossible d'ouvrir la session locale.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="glass-panel rounded-4xl p-5 sm:p-6"
      id="connexion"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-cream">Ouvrir le coffre</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            La session reste locale et révocable. Aucun mot de passe, aucun jeton
            Facebook n&apos;est enregistré.
          </p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/12 text-brand-soft">
          <Icon name="lock" size={16} />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-line/80 bg-void/50 p-1">
        {(
          [
            { key: "demo", label: "Session démo", icon: "sparkles" },
            { key: "cookie", label: "Cookie c_user", icon: "database" },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setMode(option.key)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition",
              mode === option.key
                ? "bg-brand/18 text-cream shadow-[inset_0_0_0_1px_rgba(91,124,250,0.35)]"
                : "text-muted hover:text-cream",
            )}
          >
            <Icon name={option.icon} size={14} />
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Nom du profil local
          </span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={48}
            placeholder="Compte personnel"
            className="w-full rounded-xl border border-line bg-void/60 px-3.5 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:border-brand/60 focus:outline-none"
          />
        </label>

        {mode === "cookie" ? (
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              Valeur du cookie <span className="font-mono lowercase">c_user</span>
            </span>
            <input
              value={cookie}
              onChange={(event) => setCookie(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="100001234567890"
              className="w-full rounded-xl border border-line bg-void/60 px-3.5 py-2.5 font-mono text-sm text-cream placeholder:text-muted/50 focus:border-brand/60 focus:outline-none"
            />
            <span className="mt-1.5 block text-[11px] leading-relaxed text-muted/80">
              Sur Android, cette valeur est lue dans le CookieManager du WebView
              borné. Ici, elle sert uniquement à créer un marqueur de session local
              (5 à 20 chiffres).
            </span>
          </label>
        ) : (
          <div className="rounded-xl border border-line/70 bg-panel-2/50 px-3.5 py-3 text-[11px] leading-relaxed text-muted">
            Le bouton crée un marqueur <span className="font-mono">c_user</span>{" "}
            fictif : idéal pour tester le parcours complet, la collecte par lots et
            le lecteur hors ligne.
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || ok}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-indigo-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_rgba(91,124,250,0.9)] transition hover:brightness-110 disabled:opacity-60"
      >
        <Icon name={ok ? "check" : "unlock"} size={16} />
        {ok
          ? "Coffre ouvert — redirection…"
          : busy
            ? "Vérification…"
            : mode === "demo"
              ? "Détecter une session et déverrouiller"
              : "Ouvrir avec ce marqueur local"}
      </button>

      <ul className="mt-4 space-y-1.5 text-[11px] text-muted/80">
        <li className="flex items-center gap-2">
          <Icon name="shield" size={12} className="text-mint" />
          Navigation limitée à {GUARDRAILS.allowedDomains.join(" et ")}
        </li>
        <li className="flex items-center gap-2">
          <Icon name="sliders" size={12} className="text-brand-soft" />
          Lots de {GUARDRAILS.targetMin} à {GUARDRAILS.targetMax} vidéos, sans exception
        </li>
        <li className="flex items-center gap-2">
          <Icon name="database" size={12} className="text-amber" />
          Médias isolés du reste du système, accessibles seulement coffre ouvert
        </li>
      </ul>
    </form>
  );
}
