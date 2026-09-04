import Link from 'next/link'
import { fr } from '@/lib/i18n/fr'

/**
 * La marque « ialab », en texte : deux syllabes, un point. Sur le violet de
 * la vitrine, « ia » est turquoise et le reste blanc ; sur le fond clair du
 * Cockpit, « ia » est bleu et le reste marine. Aucune image.
 */
export function MarqueIalab({
  variante = 'vitrine',
  href = '/',
  taille = 'text-3xl',
  className,
}: {
  variante?: 'vitrine' | 'cockpit'
  href?: string
  taille?: string
  className?: string
}) {
  const [ia, lab] = fr.backoffice.marque
  const couleurs =
    variante === 'vitrine'
      ? { ia: 'text-vitrine-turquoise', lab: 'text-white', point: 'bg-vitrine-jaune' }
      : { ia: 'text-bo-bleu', lab: 'text-bo-texte', point: 'bg-bo-jaune' }

  return (
    <Link
      href={href}
      aria-label={fr.app.nom}
      className={`titre inline-flex items-baseline leading-none ${taille} ${className ?? ''}`}
    >
      <span className={couleurs.ia}>{ia}</span>
      <span className={couleurs.lab}>{lab}</span>
      <span className={`ml-1 inline-block h-[0.3em] w-[0.3em] rounded-full ${couleurs.point}`} aria-hidden="true" />
    </Link>
  )
}
