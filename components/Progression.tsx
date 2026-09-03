import { fr } from '@/lib/i18n/fr'
import type { ModuleStatut } from '@/lib/db/schema'

/**
 * Jauges et pastilles d'avancement. Rendues côté serveur, en HTML/CSS pur :
 * aucune bibliothèque de graphiques ne doit atterrir sur une page apprenant.
 */

const COULEUR_STATUT: Record<ModuleStatut, string> = {
  a_venir: 'bg-bo-bordure',
  non_commence: 'bg-bo-rose',
  en_cours: 'bg-bo-jaune',
  termine: 'bg-bo-menthe',
}

const PUCE_STATUT: Record<ModuleStatut, string> = {
  a_venir: 'border-bo-bordure text-bo-doux',
  non_commence: 'border-bo-rose/40 text-bo-rose',
  en_cours: 'border-bo-jaune/40 text-bo-jaune',
  termine: 'border-bo-menthe/40 text-bo-menthe',
}

export function Jauge({
  valeur,
  statut = 'en_cours',
  className,
}: {
  /** Ratio entre 0 et 1. */
  valeur: number
  statut?: ModuleStatut
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round(valeur * 100)))
  return (
    <div
      className={`bo-jauge ${className ?? ''}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className={COULEUR_STATUT[statut]} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function StatutPuce({ statut }: { statut: ModuleStatut }) {
  return (
    <span className={`bo-puce !bg-transparent ${PUCE_STATUT[statut]}`}>
      {fr.parcours.statuts[statut]}
    </span>
  )
}

/** Histogramme de répartition : une barre par tranche de 20 %. */
export function Histogramme({ tranches }: { tranches: number[] }) {
  const max = Math.max(1, ...tranches)
  const libelles = [
    fr.backoffice.tranches.t1,
    fr.backoffice.tranches.t2,
    fr.backoffice.tranches.t3,
    fr.backoffice.tranches.t4,
    fr.backoffice.tranches.t5,
  ]
  const couleurs = ['bg-bo-rose', 'bg-bo-rose/70', 'bg-bo-jaune', 'bg-bo-menthe/70', 'bg-bo-menthe']

  return (
    <div>
      <div className="flex h-36 items-end gap-2">
        {tranches.map((n, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-xs font-semibold tabular-nums text-bo-texte">{n}</span>
            <div
              className={`w-full rounded-t-md ${couleurs[i]}`}
              style={{ height: `${Math.max(4, (n / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {libelles.map((l) => (
          <span key={l} className="flex-1 text-center text-[10px] leading-tight text-bo-doux">
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}
