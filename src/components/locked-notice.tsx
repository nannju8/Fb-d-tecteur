import Link from "next/link";
import { Icon } from "@/components/icons";
import { Card } from "@/components/ui";
import { GUARDRAILS } from "@/lib/guardrails";

export function LockedNotice({ section }: { section: string }) {
  return (
    <Card className="mx-auto max-w-xl overflow-hidden">
      <div className="grid-backdrop border-b border-line/60 bg-gradient-to-br from-brand/10 to-transparent px-6 py-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-brand/30 bg-panel text-brand-soft">
          <Icon name="lock" size={24} />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-cream">{section} verrouillé</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Cette zone fait partie du coffre privé. Connectez une session locale pour
          déverrouiller la collecte, l&apos;import et la lecture hors ligne.
        </p>
      </div>
      <div className="space-y-3 px-6 py-5">
        <ul className="space-y-2 text-xs text-muted">
          <li className="flex items-center gap-2">
            <Icon name="shield" size={13} className="text-mint" />
            Aucun média n&apos;est servi tant que le coffre est verrouillé.
          </li>
          <li className="flex items-center gap-2">
            <Icon name="sliders" size={13} className="text-brand-soft" />
            Les lots restent limités à {GUARDRAILS.targetMax} vidéos par session.
          </li>
        </ul>
        <Link
          href="/#connexion"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-indigo-400 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Icon name="unlock" size={16} />
          Ouvrir le coffre
        </Link>
      </div>
    </Card>
  );
}
