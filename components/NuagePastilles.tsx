import { fr } from '@/lib/i18n/fr'
import { MARQUES_OUTILS } from '@/components/MarquesIA'

const v = fr.vitrine

/**
 * Inclinaisons des pastilles. Faibles et alternées : au-delà de 3 degrés le
 * texte devient pénible à lire, et l'effet « éparpillé » de la maquette est
 * déjà obtenu.
 */
const INCLINAISONS = [
  '-rotate-3',
  'rotate-2',
  '-rotate-1',
  'rotate-3',
  '-rotate-2',
  'rotate-1',
  'rotate-2',
] as const

/** En mode nuage, un léger décalage vertical en plus, pour casser les rangées. */
const DECALAGES = ['translate-y-1', '-translate-y-2', 'translate-y-0', '-translate-y-1', 'translate-y-2'] as const

/**
 * Les pastilles flottantes « Music / Play / Learning » de la maquette.
 *
 * Deux dispositions du même contenu :
 *   - `ligne` (défaut) — la rangée du héros, qui prend toute la largeur.
 *   - `nuage` — la grappe resserrée de la maquette, dans une boîte étroite où
 *     les pastilles se répartissent sur deux ou trois rangs et se décalent
 *     un peu, comme posées à la main.
 *
 * Aucune position absolue : tout reste dans le flux, donc tout se réagence
 * seul sur un écran étroit, et chaque angle se redresse au survol.
 */
export function NuagePastilles({
  nuage = false,
  className,
}: {
  nuage?: boolean
  className?: string
}) {
  return (
    <ul
      className={`flex flex-wrap items-center justify-center ${
        nuage ? 'max-w-xs gap-2 sm:max-w-sm' : 'gap-2 sm:gap-3'
      } ${className ?? ''}`}
    >
      {v.pastilles.map((p, i) => {
        // Les outils nommés portent leur marque devant le mot.
        const Marque = p in MARQUES_OUTILS ? MARQUES_OUTILS[p as keyof typeof MARQUES_OUTILS] : null
        return (
          <li
            key={p}
            className={`pastille transition-transform duration-200 hover:translate-y-0 hover:rotate-0 ${
              Marque ? 'inline-flex items-center gap-1.5' : ''
            } ${INCLINAISONS[i % INCLINAISONS.length]} ${nuage ? DECALAGES[i % DECALAGES.length] : ''}`}
          >
            {Marque ? <Marque className="h-4 w-4 shrink-0" /> : null}
            {p}
          </li>
        )
      })}
    </ul>
  )
}
