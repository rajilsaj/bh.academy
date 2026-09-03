/**
 * La scène R2-D2 — Three.js, chargée à la demande par `components/R2D2.tsx`.
 *
 * Ce module n'est importé que lorsque la boîte entre dans le viewport, sur un
 * écran `lg` sans « moins de mouvement » ni économie de données : Three.js
 * et le modèle ne coûtent rien aux autres visiteurs.
 *
 * Ce que fait la scène :
 *   - un rendu à fond transparent (`alpha: true`, clear alpha 0) : le violet
 *     et la grille du panneau restent le vrai fond ;
 *   - le FBX chargé par FBXLoader, ses textures PBR affectées à la main
 *     (le FBX ne référence pas nos WebP réduits) ;
 *   - un AnimationMixer si le fichier porte des clips — le nôtre n'en a pas :
 *     le déplacement est procédural (roulement gauche-droite, inclinaison,
 *     rotation du dôme) ;
 *   - un éclairage « interface web » : hémisphérique doux, une clé, un
 *     contre-jour turquoise pour détacher la silhouette ;
 *   - OrbitControls bridés : ni zoom, ni panoramique, inclinaison limitée,
 *     et `touch-action: pan-y` pour que le doigt fasse défiler la page ;
 *   - un bip de droïde synthétisé au clic (Web Audio) — aucun fichier son,
 *     rien d'emprunté : les bips originaux étaient déjà de la synthèse ;
 *   - redimensionnement par ResizeObserver, boucle de rendu seulement quand
 *     la boîte est visible et l'onglet actif, et un démontage complet.
 */
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const RACINE = '/3d/r2d2'

/*
 * Couleurs de l'éclairage. Le rendu 3D n'est pas du CSS et ne lit pas la
 * palette Tailwind ; ces valeurs reprennent celles de `tailwind.config.ts`
 * (violet #5A32D5, turquoise #4FE0D2) — à mettre à jour ensemble.
 */
const VIOLET = 0x5a32d5
const TURQUOISE = 0x4fe0d2

export type Options = {
  /** Appelé une fois le modèle chargé et posé dans la scène. */
  surCharge?: () => void
  /** Appelé si le chargement échoue : l'appelant garde alors son image. */
  surErreur?: (raison: unknown) => void
  /** Avancement, de 0 à 1, au fil des fichiers reçus (modèle et textures). */
  surProgres?: (fraction: number) => void
}

export type Poignee = {
  /** Arrête la boucle, libère GPU et mémoire, retire le canvas. */
  demonter: () => void
  /** Joue un bip de droïde — à appeler depuis un geste utilisateur. */
  bip: () => void
}

export function monter(conteneur: HTMLElement, options: Options = {}): Poignee {
  // ------------------------------------------------------------ rendu
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  conteneur.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  camera.position.set(0, 1.35, 7)

  // --------------------------------------------------------- lumières
  scene.add(new THREE.HemisphereLight(0xffffff, VIOLET, 0.9))
  scene.add(new THREE.AmbientLight(0xffffff, 0.3))
  const cle = new THREE.DirectionalLight(0xffffff, 2.4)
  cle.position.set(3, 5, 4)
  scene.add(cle)
  const contre = new THREE.DirectionalLight(TURQUOISE, 1.4)
  contre.position.set(-4, 3, -3)
  scene.add(contre)

  // --------------------------------------------------------- contrôles
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false
  controls.enablePan = false
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minPolarAngle = Math.PI * 0.38
  controls.maxPolarAngle = Math.PI * 0.52
  controls.target.set(0, 1, 0)
  // OrbitControls pose `touch-action: none` : on rend le défilement vertical au doigt.
  renderer.domElement.style.touchAction = 'pan-y'

  // -------------------------------------------------------- chargement
  const manager = new THREE.LoadingManager()
  manager.onStart = (url) => console.info('[R2-D2] chargement…', url)
  manager.onProgress = (url, faits, total) => {
    console.info(`[R2-D2] ${faits}/${total}`, url)
    options.surProgres?.(total ? faits / total : 0)
  }
  manager.onError = (url) => console.error('[R2-D2] échec :', url)
  // Le FBX porte les chemins absolus du poste de l'artiste (…/model_R2D2_BaseColor.png).
  // Sans cela, le chargeur les demande tels quels : quatre 404 par visite. On
  // les renvoie vers nos textures WebP, déjà en cache.
  manager.setURLModifier((url) => {
    const m = /model_R2D2_(BaseColor|Emissive|Roughness|Metallic|Normal).png$/i.exec(url)
    return m ? `${RACINE}/textures/${m[1].toLowerCase()}.webp` : url
  })

  const textures = new THREE.TextureLoader(manager)
  const texture = (nom: string, couleur: boolean) => {
    const t = textures.load(`${RACINE}/textures/${nom}.webp`)
    t.colorSpace = couleur ? THREE.SRGBColorSpace : THREE.NoColorSpace
    return t
  }
  const materiau = new THREE.MeshStandardMaterial({
    map: texture('basecolor', true),
    normalMap: texture('normal', false),
    roughnessMap: texture('roughness', false),
    metalnessMap: texture('metallic', false),
    emissiveMap: texture('emissive', true),
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.9,
    metalness: 1,
    roughness: 1,
  })

  let droide: THREE.Group | null = null
  let dome: THREE.Object3D | null = null
  let mixer: THREE.AnimationMixer | null = null
  let charge = false

  new FBXLoader(manager).load(
    `${RACINE}/R2-D2.fbx`,
    (objet) => {
      objet.traverse((enfant) => {
        if ((enfant as THREE.Mesh).isMesh) (enfant as THREE.Mesh).material = materiau
      })

      // Le FBX est exporté Z vers le haut, Three.js travaille Y vers le haut :
      // le droïde arrivait couché, dôme vers la caméra. On le redresse dans un
      // pivot, et c'est le pivot qu'on mesure, pose et anime.
      objet.rotation.x = -Math.PI / 2
      const pivot = new THREE.Group()
      pivot.add(objet)

      // Normalise l'échelle et pose le droïde au sol, centré.
      const boite = new THREE.Box3().setFromObject(pivot)
      const taille = boite.getSize(new THREE.Vector3())
      const echelle = 2.2 / Math.max(taille.y, 1e-6)
      pivot.scale.setScalar(echelle)
      boite.setFromObject(pivot)
      const centre = boite.getCenter(new THREE.Vector3())
      pivot.position.x -= centre.x
      pivot.position.z -= centre.z
      pivot.position.y -= boite.min.y

      // Le dôme, s'il est nommé comme tel : il tournera seul.
      objet.traverse((enfant) => {
        if (!dome && /dome|head|tete|tête/i.test(enfant.name)) dome = enfant
      })

      // Des clips ? On joue le premier. Le nôtre n'en a pas : rien ne se passe ici.
      if (objet.animations.length) {
        mixer = new THREE.AnimationMixer(objet)
        mixer.clipAction(objet.animations[0]).play()
        console.info('[R2-D2] animation :', objet.animations[0].name)
      }

      droide = pivot
      scene.add(pivot)
      charge = true
      console.info('[R2-D2] prêt')
      options.surCharge?.()
    },
    undefined,
    (raison) => {
      console.error('[R2-D2]', raison)
      options.surErreur?.(raison)
    },
  )

  // ------------------------------------------------------------- son
  let audio: AudioContext | null = null
  /** Bips de droïde : quelques glissandos de sinusoïde, comme sur un synthé. */
  function bip() {
    try {
      audio ??= new (window.AudioContext || (window as any).webkitAudioContext)()
      const ctx = audio
      if (ctx.state === 'suspended') void ctx.resume()
      const sortie = ctx.createGain()
      sortie.gain.value = 0.18
      sortie.connect(ctx.destination)
      let t = ctx.currentTime + 0.02
      const n = 3 + Math.floor(Math.random() * 4)
      for (let i = 0; i < n; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = Math.random() < 0.5 ? 'sine' : 'triangle'
        const duree = 0.06 + Math.random() * 0.12
        const de = 500 + Math.random() * 1500
        const vers = 500 + Math.random() * 1900
        osc.frequency.setValueAtTime(de, t)
        osc.frequency.exponentialRampToValueAtTime(vers, t + duree)
        gain.gain.setValueAtTime(0.0001, t)
        gain.gain.exponentialRampToValueAtTime(1, t + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duree)
        osc.connect(gain).connect(sortie)
        osc.start(t)
        osc.stop(t + duree + 0.02)
        t += duree + 0.02 + Math.random() * 0.05
      }
    } catch {
      /* pas d'audio : le droïde reste muet, rien d'autre ne change */
    }
  }

  let sursaut = 0
  const auClic = () => {
    bip()
    sursaut = 1
  }
  renderer.domElement.addEventListener('click', auClic)

  // ------------------------------------------------ taille & visibilité
  function redimensionner() {
    const l = Math.max(1, conteneur.clientWidth)
    const h = Math.max(1, conteneur.clientHeight)
    camera.aspect = l / h
    camera.updateProjectionMatrix()
    renderer.setSize(l, h, false)
  }
  const observateurTaille = new ResizeObserver(redimensionner)
  observateurTaille.observe(conteneur)
  window.addEventListener('resize', redimensionner)
  redimensionner()

  let visible = true
  const observateurVue = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting
      relancer()
    },
    { rootMargin: '10%' },
  )
  observateurVue.observe(conteneur)
  document.addEventListener('visibilitychange', relancer)

  // ---------------------------------------------------------- boucle
  const horloge = new THREE.Clock()
  let raf = 0
  let temps = 0
  const AMPLITUDE = 1.7
  const VITESSE = 0.45

  function image() {
    raf = 0
    const dt = Math.min(horloge.getDelta(), 0.05)
    temps += dt

    if (droide) {
      // Roulement gauche-droite : position en sinus, cap dans le sens du mouvement.
      const x = Math.sin(temps * VITESSE) * AMPLITUDE
      const direction = Math.cos(temps * VITESSE)
      droide.position.x = x
      const capCible = direction >= 0 ? Math.PI / 2 : -Math.PI / 2
      droide.rotation.y += (capCible - droide.rotation.y) * Math.min(1, dt * 4)
      // Légère inclinaison dans le sens de la course, sursaut au clic.
      droide.rotation.z = -direction * 0.05 + Math.sin(temps * 22) * 0.02 * sursaut
      if (dome) dome.rotation.y += dt * (0.6 + sursaut * 6)
      sursaut = Math.max(0, sursaut - dt * 1.5)
    }
    mixer?.update(dt)
    controls.update()
    renderer.render(scene, camera)

    if (visible && !document.hidden) raf = requestAnimationFrame(image)
  }
  function relancer() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(image)
  }
  raf = requestAnimationFrame(image)

  // ------------------------------------------------------- démontage
  const demonter = () => {
    if (raf) cancelAnimationFrame(raf)
    observateurTaille.disconnect()
    observateurVue.disconnect()
    window.removeEventListener('resize', redimensionner)
    document.removeEventListener('visibilitychange', relancer)
    renderer.domElement.removeEventListener('click', auClic)
    controls.dispose()
    droide?.traverse((enfant) => {
      const m = enfant as THREE.Mesh
      if (m.isMesh) m.geometry.dispose()
    })
    for (const t of [materiau.map, materiau.normalMap, materiau.roughnessMap, materiau.metalnessMap, materiau.emissiveMap]) t?.dispose()
    materiau.dispose()
    renderer.dispose()
    renderer.domElement.remove()
    void audio?.close()
    if (!charge) console.info('[R2-D2] démonté avant la fin du chargement')
  }
  return { demonter, bip: auClic }
}
