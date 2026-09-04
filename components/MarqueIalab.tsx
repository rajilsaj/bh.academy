import Link from 'next/link'
import { fr } from '@/lib/i18n/fr'

/**
 * La marque « ia.lab », en texte : deux syllabes séparées par un point, et
 * sous elle, si on le demande, la signature « Laboratoire d'intelligence
 * artificielle appliquée ». Aucune image : sur la vitrine tout est blanc et
 * le point turquoise ; sur le fond clair du Cockpit tout est bleu.
 */
export function MarqueIalab({
  variante = 'vitrine',
  href = '/',
  taille = 'text-3xl',
  sousTitre = false,
  className,
}: {
  variante?: 'vitrine' | 'cockpit'
  href?: string
  taille?: string
  /** Affiche la signature complète sous le mot. */
  sousTitre?: boolean
  className?: string
}) {
  const [ia, lab] = fr.backoffice.marque
  const c =
    variante === 'vitrine'
      ? { mot: 'text-white', point: 'text-vitrine-turquoise', sous: 'text-white/70' }
      : { mot: 'text-bo-bleu', point: 'text-bo-bleu', sous: 'text-bo-doux' }

  return (
    <Link href={href} aria-label={`${ia}.${lab} — ${fr.backoffice.marqueSousTitre}`} className={`inline-block ${className ?? ''}`}>
      <span className={`titre block leading-none tracking-tight ${taille} ${c.mot}`}>
        {ia}
        <span className={c.point}>.</span>
        {lab}
      </span>
      {sousTitre ? (
        <span className={`mt-1 block text-sm font-semibold leading-snug ${c.sous}`}>{fr.backoffice.marqueSousTitre}</span>
      ) : null}
    </Link>
  )
}
