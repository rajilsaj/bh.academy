import { fr } from '@/lib/i18n/fr'
import { PHOTOS } from '@/lib/photos'
import { Photo } from '@/components/Photo'
import { Etincelle, FlecheZigzag } from '@/components/Decor'

const v = fr.vitrine

/**
 * Le cadre central du héros et tout ce qui flotte autour — la « vidéo » de la
 * maquette avec ses glyphes en relief, ses équations griffonnées, son
 * autocollant photo et sa flèche anguleuse.
 *
 * Tout est ancré sur le cadre, pas sur la section : les décorations restent
 * dans les deux couloirs libérés par `xl:mx-24` de chaque côté de la photo,
 * quelle que soit la hauteur du texte au-dessus. Sous `xl` les couloirs
 * n'existent pas, les décorations non plus.
 *
 * Le disque jaune reprend le bouton « lecture » de la maquette, mais en vrai
 * lien vers le programme : un faux bouton de lecture serait un mensonge.
 *
 * Aucune image en plus : les glyphes sont du texte et du SVG en relief CSS.
 */
export function ImmersionHeros() {
  const armoiries = PHOTOS.armoiries
  const srcSet = (ext: string) =>
    armoiries.largeurs.map((l) => `/photos/${armoiries.slot}-${l}.${ext} ${l}w`).join(', ')
  const [g1, g2, g3] = v.griffonnages

  return (
    <div className="relative mt-10 lg:mt-12 xl:mx-24 2xl:mx-32">
      {/* ------------------------------------------------ couloir gauche */}
      <span
        aria-hidden="true"
        className="titre relief-texte parallaxe-lent absolute -left-24 top-[8%] hidden -rotate-6 select-none text-6xl text-vitrine-turquoise xl:block"
      >
        &gt;_
      </span>
      <Etincelle className="relief-svg parallaxe-rapide absolute -left-20 top-[48%] hidden h-16 w-16 rotate-12 text-vitrine-vert xl:block" />
      <p className="griffonnage parallaxe-lent absolute -bottom-12 left-0 hidden -rotate-3 text-2xl xl:block">
        {g1}
      </p>

      {/* ------------------------------------------------ couloir droit */}
      <div className="parallaxe-lent absolute -right-20 -top-12 hidden xl:block">
        <div className="relative h-36 w-36">
          {/* Les armoiries, déjà posées sur fond blanc par le pipeline, dans le rond. */}
          <picture>
            <source type="image/avif" srcSet={srcSet('avif')} sizes="128px" />
            <source type="image/webp" srcSet={srcSet('webp')} sizes="128px" />
            <img
              src={`/photos/${armoiries.slot}-240.jpg`}
              srcSet={srcSet('jpg')}
              sizes="128px"
              alt={v.photos.armoiries}
              width={armoiries.largeurRef}
              height={armoiries.hauteurRef}
              loading="lazy"
              decoding="async"
              className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] rounded-full bg-white object-cover ring-4 ring-white"
            />
          </picture>
        </div>
      </div>
      <p className="griffonnage parallaxe-rapide absolute -right-28 top-[38%] hidden rotate-2 text-2xl xl:block">
        {g2}
      </p>
      <p className="griffonnage parallaxe-lent absolute -right-28 top-[62%] hidden -rotate-2 text-3xl xl:block">
        {g3}
      </p>
      <FlecheZigzag className="parallaxe-rapide absolute -bottom-6 -right-24 hidden h-14 w-20 text-vitrine-turquoise xl:block" />

      {/* ---------------------------------------------------- la photo */}
      <div className="overflow-hidden rounded-carte border border-white/15">
        <Photo
          nom="heros"
          alt={v.photos.heros}
          prioritaire
          sizes="(min-width: 1536px) 70rem, (min-width: 1280px) calc(100vw - 22rem), (min-width: 1024px) calc(100vw - 10rem), 100vw"
          className="h-auto w-full object-cover"
        />
      </div>

      {/* Le disque jaune de la maquette — un vrai lien, pas un faux bouton de lecture. */}
      <a
        href="#programme"
        aria-label={v.heroSecondaire}
        className="absolute -bottom-6 right-6 grid h-16 w-16 place-items-center rounded-full bg-vitrine-jaune text-2xl text-vitrine-violet-fonce shadow-xl shadow-black/30 transition-transform hover:scale-105 sm:-bottom-7 sm:right-8 sm:h-20 sm:w-20 sm:text-3xl"
      >
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  )
}
