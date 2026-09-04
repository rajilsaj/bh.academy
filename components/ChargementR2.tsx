'use client'

import { useEffect, useRef, useState } from 'react'
import { fr } from '@/lib/i18n/fr'
import { connexionLente } from '@/lib/economie-client'
import { Croix, Etincelle, Etoile, Spirale } from './Decor'

/**
 * L'écran de chargement : R2-D2 roule pendant que la page arrive, puis
 * s'efface.
 *
 * Il est rendu côté serveur, donc présent dès le premier affichage — pas de
 * contenu qui apparaît puis se cache. Trois garde-fous, sans JavaScript :
 *   - `<noscript>` le masque quand les scripts sont coupés ;
 *   - la feuille `.chargement-r2` le masque sous `lg`, en « moins de
 *     mouvement », et donc sur tout téléphone — un loader de 2 Mo y serait
 *     plus lent que la page elle-même ;
 *   - un script en ligne, exécuté avant le premier rendu, pose `html.r2-vu`
 *     si l'écran a déjà été vu pendant la visite : poser une question ou
 *     recharger ne le ramène pas. La feuille le masque alors, sans éclair.
 * Côté client : le droïde reste au moins 2 s à l'écran *une fois apparu* —
 * compter depuis le montage le ferait disparaître à peine chargé — et l'écran
 * s'efface à 5 s au plus tard même si le modèle traîne, puis tout est démonté.
 *
 * Le son ne peut pas partir seul — aucun navigateur ne le permet avant un
 * geste — : le premier toucher ou clic fait biper le droïde, et l'écran le dit.
 */
/** Temps de droïde visible, compté à partir de son apparition. */
const DROIDE_VISIBLE_MS = 2000
/** Plafond absolu depuis le montage, modèle chargé ou non. */
const MAXIMUM_MS = 5000
const FONDU_MS = 500
/** Clé de session : l'écran ne se montre qu'une fois par visite. */
const CLE_VU = 'r2-vu'

const dejaVu = () => {
  try {
    return sessionStorage.getItem(CLE_VU) === '1'
  } catch {
    return false
  }
}

export function ChargementR2() {
  const boite = useRef<HTMLDivElement>(null)
  const [etat, setEtat] = useState<'visible' | 'fondu' | 'fini'>('visible')
  /** Le modèle est posé : la boîte du droïde apparaît en fondu. */
  const [droide, setDroide] = useState(false)
  /** Fichiers reçus, de 0 à 1 : la barre avance vraiment. */
  const [progres, setProgres] = useState(0)

  useEffect(() => {
    const el = boite.current
    if (!el) return
    const convient =
      !dejaVu() &&
      window.matchMedia('(min-width: 1024px)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !connexionLente()
    if (!convient) {
      setEtat('fini')
      return
    }
    try {
      sessionStorage.setItem(CLE_VU, '1')
    } catch {
      /* Navigation privée stricte : l'écran reviendra, ce n'est pas grave. */
    }

    let annule = false
    let poignee: { demonter: () => void; bip: () => void } | undefined
    document.body.style.overflow = 'hidden'

    const finir = () => {
      if (annule) return
      annule = true
      setEtat('fondu')
      window.setTimeout(() => {
        setEtat('fini')
        document.body.style.overflow = ''
        poignee?.demonter()
      }, FONDU_MS)
    }
    const plafond = window.setTimeout(finir, MAXIMUM_MS)
    // Le droïde vient d'apparaître : on le laisse rouler, sans dépasser le plafond.
    const droideApparu = () => {
      setDroide(true)
      setProgres(1)
      window.setTimeout(finir, DROIDE_VISIBLE_MS)
    }

    import('./r2d2/scene').then(({ monter }) => {
      if (annule) return
      poignee = monter(el, { surCharge: droideApparu, surErreur: finir, surProgres: setProgres })
    })

    // Le premier geste débloque l'audio : le droïde bipe.
    const auGeste = () => poignee?.bip()
    window.addEventListener('pointerdown', auGeste)

    return () => {
      window.removeEventListener('pointerdown', auGeste)
      window.clearTimeout(plafond)
      document.body.style.overflow = ''
      poignee?.demonter()
      annule = true
    }
  }, [])

  if (etat === 'fini') return null

  return (
    <>
      <noscript>
        <style>{`.chargement-r2{display:none}`}</style>
      </noscript>
      {/* Avant le premier rendu : déjà vu pendant la visite → masqué par la feuille. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem('${CLE_VU}')==='1')document.documentElement.classList.add('r2-vu')}catch(e){}`,
        }}
      />
      <div
        role="status"
        aria-live="polite"
        aria-label={fr.vitrine.r2d2}
        className={`chargement-r2 fond-espace inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden transition-opacity motion-reduce:transition-none ${
          etat === 'fondu' ? 'opacity-0' : 'opacity-100'
        }`}
        /* `.fond-espace` pose `relative` ; l'inline l'emporte, sans dépendre de l'ordre des feuilles. */
        style={{ position: 'fixed', transitionDuration: `${FONDU_MS}ms` }}
      >
        {/* Halos de la palette, comme derrière le héros. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-vitrine-violet/50 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-vitrine-turquoise/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-vitrine-rose/20 blur-3xl"
        />

        {/* Griffonnages épars, à la main levée du reste de la vitrine. */}
        <Etoile className="griffonnage absolute left-[16%] top-[20%] h-9 w-9 text-vitrine-jaune" />
        <Etincelle className="griffonnage absolute right-[18%] top-[24%] h-12 w-12 text-vitrine-turquoise" />
        <Spirale className="griffonnage absolute left-[22%] bottom-[22%] h-12 w-12 text-vitrine-rose" />
        <Croix className="griffonnage absolute right-[22%] bottom-[26%] h-7 w-7 text-white/70" />
        <Etoile className="griffonnage absolute right-[30%] top-[62%] h-5 w-5 text-white/60" />

        <div className="relative flex flex-col items-center">
          <div className="relative">
            {/* Le sol : une ombre douce sous les roues. */}
            <div
              aria-hidden="true"
              className={`absolute inset-x-16 bottom-1 h-8 rounded-[100%] bg-black/40 blur-xl transition-opacity duration-500 ${
                droide ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <div
              ref={boite}
              className={`h-72 w-[28rem] max-w-[90vw] transition-opacity duration-500 ${
                droide ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          <p className="manuscrit mt-1 text-4xl text-vitrine-turquoise">
            {fr.vitrine.chargementAccroche}
          </p>
          <p className="titre mt-1 text-2xl text-white">{fr.vitrine.chargementTitre}</p>

          {/* La barre avance au rythme des fichiers reçus. */}
          <div className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
            <div
              className="h-full rounded-full bg-vitrine-jaune transition-[width] duration-500 ease-out"
              style={{ width: `${Math.round(Math.max(0.08, progres) * 100)}%` }}
            />
          </div>

          <p className="mt-4 text-sm font-semibold text-white/60">{fr.vitrine.chargementSon}</p>
        </div>
      </div>
    </>
  )
}
