import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Les briques d'écran du Cockpit, pour que chaque page se lise pareil :
 * un en-tête (titre, sous-titre, actions à droite), des tuiles de chiffres,
 * un état vide qui dit quoi faire, et une barre d'actions groupées.
 */

export function EnTete({
  titre,
  sousTitre,
  retour,
  actions,
}: {
  titre: ReactNode
  sousTitre?: ReactNode
  /** Lien de retour, affiché en fil d'Ariane au-dessus du titre. */
  retour?: { href: string; label: string }
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {retour ? (
          <p className="bo-doux mb-1">
            <Link href={retour.href} className="underline decoration-bo-doux underline-offset-2 hover:text-bo-bleu">
              ← {retour.label}
            </Link>
          </p>
        ) : null}
        <h1 className="text-2xl lg:text-3xl">{titre}</h1>
        {sousTitre ? <p className="mt-1 max-w-3xl text-sm text-bo-doux">{sousTitre}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Stat({
  label,
  valeur,
  detail,
  href,
  accent = 'jaune',
}: {
  label: string
  valeur: ReactNode
  detail?: ReactNode
  href?: string
  accent?: 'jaune' | 'menthe' | 'rose' | 'blanc'
}) {
  const couleur = {
    jaune: 'text-bo-bleu',
    menthe: 'text-bo-menthe',
    rose: 'text-bo-rose',
    blanc: 'text-bo-texte',
  }[accent]
  const contenu = (
    <>
      <p className="bo-doux">{label}</p>
      <p className={`bo-chiffre mt-1 ${couleur}`}>{valeur}</p>
      {detail ? <p className="bo-doux mt-1">{detail}</p> : null}
    </>
  )
  return href ? (
    <Link href={href} className="bo-panneau block transition-colors hover:bg-bo-panneau-2">
      {contenu}
    </Link>
  ) : (
    <div className="bo-panneau">{contenu}</div>
  )
}

export function Vide({ titre, texte, action }: { titre: string; texte?: string; action?: ReactNode }) {
  return (
    <div className="rounded-bloc border border-dashed border-bo-bordure px-6 py-10 text-center">
      <p className="font-semibold">{titre}</p>
      {texte ? <p className="bo-doux mx-auto mt-1 max-w-md">{texte}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

/**
 * La barre d'actions groupées. Les cases à cocher sont dans la table, reliées
 * par `form=` ; la barre n'apparaît que si une case est cochée dans la section
 * qui porte `group/selection` (CSS `:has`, sans JavaScript).
 */
export function BarreSelection({ children, formId }: { children: ReactNode; formId: string }) {
  return (
    <form
      id={formId}
      className="bo-sous-panneau hidden flex-wrap items-center gap-2 group-has-[input:checked]/selection:flex"
    >
      {children}
    </form>
  )
}

/** Titre de section dans un panneau, avec un compteur et des actions à droite. */
export function TitreSection({ titre, compte, actions }: { titre: ReactNode; compte?: number; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">
        {titre}
        {compte !== undefined ? <span className="bo-doux ml-2">({compte})</span> : null}
      </h2>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
