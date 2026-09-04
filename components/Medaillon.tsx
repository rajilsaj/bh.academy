import { fr } from '@/lib/i18n/fr'
import { FlecheBouclee } from '@/components/Decor'

const v = fr.vitrine

/** Proportions du fichier d'origine : 1600 × 950. */
const RATIO = 1600 / 950
const LARGEURS = [200, 300, 400]

/**
 * Médaillon flottant du héros — l'élément rond de la maquette, avec le
 * gribouillis qui s'en échappe vers le bas.
 *
 * Le logo FONEA est posé **à l'intérieur** du cercle blanc, jamais sur le
 * violet : ses couleurs (vert, jaune, rouge, violet) ont besoin d'un fond
 * neutre. Le cercle est calé en carré et le logo en `object-contain` avec
 * une marge : un logo plus large que haut ne touche jamais le bord.
 *
 * Masqué sous `xl` : plus étroit, il empiéterait sur le titre centré. La
 * mention FONEA reste dans le bandeau des partenaires, visible partout.
 */
export function Medaillon() {
  const srcSet = LARGEURS.map((l) => `/photos/logo/fonea-marque-${l}.png ${l}w`).join(', ')

  return (
    <div className="eco-cacher parallaxe-lent absolute left-6 top-24 hidden xl:block 2xl:left-12">
      {/* Le disque est un lien vers le site du FONEA. */}
      <a
        href={v.foneaUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={v.partenaireFonea}
        className="grid h-28 w-28 place-items-center rounded-full bg-white p-4 transition-transform hover:scale-105 2xl:h-32 2xl:w-32"
      >
        <img
          src="/photos/logo/fonea-marque-300.png"
          srcSet={srcSet}
          sizes="112px"
          alt={v.partenaireFonea}
          width={300}
          height={Math.round(300 / RATIO)}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      </a>
      {/* La flèche bouclée qui descend du médaillon, comme dans la maquette. */}
      <FlecheBouclee className="ml-7 mt-2 h-24 w-[4.5rem] text-vitrine-turquoise/85" />
    </div>
  )
}
