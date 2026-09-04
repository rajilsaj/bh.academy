'use client'

import { useEffect, useRef } from 'react'
import { connexionLente } from '@/lib/economie-client'

/**
 * Hyperespace — le fond du site.
 *
 * Un canvas fixe, plein écran, sous tout le contenu. Au repos, un champ
 * d'étoiles lointaines dérive lentement vers la caméra. Un clic sur le fond
 * (pas sur le contenu : le canvas est *sous* le panneau, seuls les bords
 * visibles réagissent) déclenche le saut : les étoiles s'étirent en traînées
 * radiales dont la longueur suit la vitesse, puis le tunnel s'ouvre — noyau
 * de plasma, dizaines d'arcs bleus qui tourbillonnent en s'élargissant,
 * poussière — puis la décélération ramène l'espace normal.
 *
 * Tout se compose en `lighter` : les chevauchements s'additionnent et
 * brillent, comme de la lumière. Pas de `shadowBlur` (lent) : l'éclat vient
 * de couches translucides superposées.
 *
 * Performance : requestAnimationFrame, densité de pixels plafonnée à 1,5,
 * boucle arrêtée quand l'onglet est caché, coordonnées normalisées sur la
 * plus petite dimension pour que le redimensionnement n'étire rien.
 * Réduction des animations : une seule image fixe d'étoiles, rien ne bouge.
 *
 * Sans JavaScript, le canvas n'existe pas : la page garde son fond lavande.
 */
export function Hyperespace() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    // Réseau lent ou données économisées : pas d'animation, le CSS masque le canvas.
    if (connexionLente()) return
    return demarrer(canvas)
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 z-0 h-full w-full bg-black"
    />
  )
}

/* ------------------------------------------------------------------ */
/* La simulation                                                        */
/* ------------------------------------------------------------------ */

/* Palette de l'effet — imposée par le sujet, pas par la charte du site. */
const BLANC = '255, 255, 255'
const BLEU_ELECTRIQUE = '64, 156, 255'
const CYAN = '0, 229, 255'
const CERULEEN = '42, 127, 255'

type Phase = 'repos' | 'etirement' | 'tunnel' | 'freinage'

type Etoile = {
  x: number // normalisé, −1…1 sur la plus petite dimension
  y: number
  z: number // profondeur, 1 = loin, → 0 = à la caméra
  px: number // dernière projection, pour la traînée
  py: number
  teinte: string
  taille: number
}

type Arc = {
  phase: number // 0…1, position sur le trajet vers l'extérieur
  vitesse: number
  angle: number // rotation propre
  spin: number
  debut: number // angle de départ de l'arc
  longueur: number // longueur angulaire
  excentricite: number
  teinte: string
}

const NB_ETOILES = 1100
const NB_ARCS = 64

/* Durées des phases, en secondes. */
const DUREE = { etirement: 0.9, tunnel: 3.2, freinage: 1.3 }
/* Vitesses (unités de profondeur par seconde). */
const V_REPOS = 0.07
const V_TUNNEL = 2.6
/* Le saut se déclenche seul : une première fois peu après l'arrivée, puis à
   intervalles irréguliers — l'effet se voit sans qu'on ait à cliquer. */
const PREMIER_SAUT = 1.8
const ENTRE_SAUTS: [number, number] = [14, 22]

function alea(a: number, b: number) {
  return a + Math.random() * (b - a)
}
function lisser(t: number) {
  return t * t * (3 - 2 * t)
}

function nouvelleEtoile(loin: boolean): Etoile {
  const teinteAlea = Math.random()
  return {
    x: alea(-1, 1) * 1.6,
    y: alea(-1, 1) * 1.6,
    z: loin ? 1 : Math.random(),
    px: NaN,
    py: NaN,
    teinte: teinteAlea < 0.55 ? BLANC : teinteAlea < 0.85 ? BLEU_ELECTRIQUE : CYAN,
    taille: alea(0.6, 1.6),
  }
}

function nouvelArc(): Arc {
  const t = Math.random()
  return {
    phase: Math.random(),
    vitesse: alea(0.35, 0.9),
    angle: alea(0, Math.PI * 2),
    spin: alea(-1.2, 1.2),
    debut: alea(0, Math.PI * 2),
    longueur: alea(0.6, 2.4),
    excentricite: alea(0.7, 1),
    teinte: t < 0.4 ? BLEU_ELECTRIQUE : t < 0.7 ? CYAN : t < 0.9 ? CERULEEN : BLANC,
  }
}

function demarrer(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return () => {}

  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  /*
   * Mode léger sur petit écran ou en économie de données : le panneau y
   * couvre toute la largeur, l'effet ne se voit qu'à peine, et un Android
   * d'entrée de gamme n'a pas à payer 1 100 étoiles à 60 images par seconde.
   * Un tiers des étoiles, pas de saut automatique, ~30 images par seconde.
   */
  const leger =
    window.matchMedia('(max-width: 767px)').matches ||
    !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  const etoiles: Etoile[] = Array.from({ length: leger ? 320 : NB_ETOILES }, () => nouvelleEtoile(false))
  const arcs: Arc[] = Array.from({ length: leger ? 28 : NB_ARCS }, nouvelArc)

  let largeur = 1
  let hauteur = 1
  let dpr = 1
  let cx = 0
  let cy = 0
  let focale = 1 // demi plus-petite-dimension : la projection ne s'étire jamais

  let phase: Phase = 'repos'
  let tempsPhase = 0
  let tempsTotal = 0
  let prochainSaut = leger ? Infinity : PREMIER_SAUT
  let vitesse = V_REPOS
  let intensite = 0 // 0 → 1, présence du tunnel
  let raf = 0
  let precedent = performance.now()

  // ---------------------------------------------------------- taille
  function redimensionner() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    largeur = Math.max(1, window.innerWidth)
    hauteur = Math.max(1, window.innerHeight)
    canvas.width = Math.round(largeur * dpr)
    canvas.height = Math.round(hauteur * dpr)
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    cx = largeur / 2
    cy = hauteur / 2
    focale = Math.min(largeur, hauteur) / 2
    // Les projections mémorisées ne valent plus rien après un redimensionnement.
    for (const e of etoiles) e.px = e.py = NaN
    if (reduit) image(precedent)
  }

  // ----------------------------------------------------------- saut
  function sauter() {
    if (phase !== 'repos' || reduit) return
    phase = 'etirement'
    tempsPhase = 0
  }
  function surClic(e: PointerEvent) {
    // Seul le fond visible déclenche : le contenu, au-dessus, ne l'atteint pas.
    if (e.target === canvas) sauter()
  }

  // ------------------------------------------------------- l'image
  function image(maintenant: number) {
    raf = 0
    // Mode léger : une image sur deux, ~30 par seconde.
    if (leger && maintenant - precedent < 30) {
      raf = requestAnimationFrame(image)
      return
    }
    const dt = Math.min((maintenant - precedent) / 1000, 0.05)
    precedent = maintenant
    if (!reduit) avancer(dt)
    dessiner(dt)
    if (!reduit && !document.hidden) raf = requestAnimationFrame(image)
  }

  function avancer(dt: number) {
    tempsPhase += dt
    tempsTotal += dt
    switch (phase) {
      case 'repos':
        vitesse += (V_REPOS - vitesse) * Math.min(1, dt * 3)
        intensite = Math.max(0, intensite - dt * 1.5)
        if (tempsTotal >= prochainSaut) sauter()
        break
      case 'etirement': {
        const t = Math.min(1, tempsPhase / DUREE.etirement)
        vitesse = V_REPOS + (V_TUNNEL - V_REPOS) * (t * t * t) // accélération franche
        intensite = Math.max(0, t - 0.6) / 0.4 // le tunnel commence à poindre à la fin
        if (t >= 1) {
          phase = 'tunnel'
          tempsPhase = 0
        }
        break
      }
      case 'tunnel':
        vitesse = V_TUNNEL
        intensite = Math.min(1, intensite + dt * 2)
        if (tempsPhase >= DUREE.tunnel) {
          phase = 'freinage'
          tempsPhase = 0
        }
        break
      case 'freinage': {
        const t = Math.min(1, tempsPhase / DUREE.freinage)
        vitesse = V_TUNNEL + (V_REPOS - V_TUNNEL) * lisser(t)
        intensite = 1 - lisser(t)
        if (t >= 1) {
          phase = 'repos'
          tempsPhase = 0
          prochainSaut = leger ? Infinity : tempsTotal + alea(ENTRE_SAUTS[0], ENTRE_SAUTS[1])
        }
        break
      }
    }

    for (const e of etoiles) {
      e.z -= vitesse * dt
      if (e.z <= 0.02) {
        Object.assign(e, nouvelleEtoile(true))
      }
    }
    for (const a of arcs) {
      a.phase += a.vitesse * dt * (0.5 + intensite)
      a.angle += a.spin * dt
      if (a.phase >= 1) Object.assign(a, nouvelArc(), { phase: 0 })
    }
  }

  function dessiner(dt: number) {
    const c = ctx!
    c.globalCompositeOperation = 'source-over'

    // Fond : noir profond, teinté de bleu au cœur quand le tunnel est là.
    c.fillStyle = '#000'
    c.fillRect(0, 0, largeur, hauteur)
    if (intensite > 0) {
      const rayon = Math.max(largeur, hauteur) * 0.75
      const noyau = c.createRadialGradient(cx, cy, 0, cx, cy, rayon)
      noyau.addColorStop(0, `rgba(${BLANC}, ${0.55 * intensite})`)
      noyau.addColorStop(0.12, `rgba(${CYAN}, ${0.45 * intensite})`)
      noyau.addColorStop(0.35, `rgba(${CERULEEN}, ${0.28 * intensite})`)
      noyau.addColorStop(0.7, `rgba(${BLEU_ELECTRIQUE}, ${0.08 * intensite})`)
      noyau.addColorStop(1, 'rgba(0, 0, 0, 0)')
      c.fillStyle = noyau
      c.fillRect(0, 0, largeur, hauteur)
    }

    // Tout ce qui suit s'additionne : la lumière se cumule là où elle se croise.
    c.globalCompositeOperation = 'lighter'
    c.lineCap = 'round'

    // ---- le tunnel : arcs de plasma qui foncent vers l'extérieur
    if (intensite > 0.01) {
      const rayonMax = Math.hypot(largeur, hauteur) * 0.55
      for (const a of arcs) {
        const p = lisser(a.phase)
        const r = 12 + p * p * rayonMax // part du cœur, s'emballe vers les bords
        const alpha = (1 - p) * (0.14 + 0.5 * intensite) * Math.min(1, p * 6)
        if (alpha <= 0.004) continue
        c.strokeStyle = `rgba(${a.teinte}, ${alpha})`
        c.lineWidth = 1.5 + p * 26 * (0.6 + intensite)
        c.beginPath()
        c.ellipse(cx, cy, r, r * a.excentricite, a.angle, a.debut, a.debut + a.longueur)
        c.stroke()
        // Un second passage fin et clair : l'arête vive de l'arc.
        c.strokeStyle = `rgba(${BLANC}, ${alpha * 0.6})`
        c.lineWidth = 1 + p * 3
        c.stroke()
      }
    }

    // ---- les étoiles : points au repos, traînées radiales en vitesse
    const etirement = Math.max(0, (vitesse - V_REPOS) / (V_TUNNEL - V_REPOS)) // 0…1
    for (const e of etoiles) {
      const k = focale / e.z
      const x = cx + e.x * k
      const y = cy + e.y * k
      const dehors = x < -60 || x > largeur + 60 || y < -60 || y > hauteur + 60
      if (dehors) {
        Object.assign(e, nouvelleEtoile(true))
        continue
      }
      const proximite = 1 - e.z // 0 loin, 1 tout près
      const alpha = 0.45 + proximite * 0.55

      if (etirement > 0.02 && !Number.isNaN(e.px)) {
        // La traînée relie la projection précédente à l'actuelle :
        // sa longueur *est* la vitesse projetée. On l'allonge encore vers
        // l'extérieur quand la vitesse monte, pour la lecture cinéma.
        const dx = x - e.px
        const dy = y - e.py
        const ex = x + dx * etirement * 2.2
        const ey = y + dy * etirement * 2.2
        c.strokeStyle = `rgba(${e.teinte}, ${alpha * (0.5 + etirement * 0.5)})`
        c.lineWidth = e.taille * (0.8 + proximite * 2.2)
        c.beginPath()
        c.moveTo(e.px, e.py)
        c.lineTo(ex, ey)
        c.stroke()
      } else {
        c.fillStyle = `rgba(${e.teinte}, ${alpha})`
        const r = e.taille * (0.75 + proximite * 1.5)
        c.beginPath()
        c.arc(x, y, r, 0, Math.PI * 2)
        c.fill()
      }
      e.px = x
      e.py = y
    }

    // ---- poussière cosmique dans le tunnel : grains vifs près du cœur
    if (intensite > 0.2) {
      const n = Math.round(40 * intensite)
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2
        const d = Math.random() * Math.random() * focale * 1.4
        c.fillStyle = `rgba(${Math.random() < 0.5 ? BLANC : CYAN}, ${alea(0.15, 0.6) * intensite})`
        c.beginPath()
        c.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, alea(0.6, 2), 0, Math.PI * 2)
        c.fill()
      }
    }

    // Vignette : garde les bords sombres pour le contraste du contenu.
    c.globalCompositeOperation = 'source-over'
    const vignette = c.createRadialGradient(cx, cy, focale * 0.9, cx, cy, Math.hypot(cx, cy))
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.35)')
    c.fillStyle = vignette
    c.fillRect(0, 0, largeur, hauteur)
    void dt
  }

  // ------------------------------------------------------ cycle de vie
  function reprendre() {
    if (!raf && !reduit && !document.hidden) {
      precedent = performance.now()
      raf = requestAnimationFrame(image)
    }
  }

  redimensionner()
  window.addEventListener('resize', redimensionner, { passive: true })
  window.addEventListener('pointerdown', surClic, { passive: true })
  document.addEventListener('visibilitychange', reprendre)
  raf = requestAnimationFrame(image)

  return () => {
    if (raf) cancelAnimationFrame(raf)
    window.removeEventListener('resize', redimensionner)
    window.removeEventListener('pointerdown', surClic)
    document.removeEventListener('visibilitychange', reprendre)
  }
}
