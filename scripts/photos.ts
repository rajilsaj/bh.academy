/**
 * Prépare les photos de la vitrine.
 *
 * Lit les fichiers déposés dans `photos-a-integrer/`, les recadre, les
 * redimensionne en plusieurs largeurs et les écrit dans `public/photos/` en
 * AVIF, WebP et JPEG. Les fichiers produits sont versionnés : le site ne
 * dépend d'aucun service d'optimisation à l'exécution, et `sharp` reste une
 * dépendance de développement.
 *
 *   npx tsx scripts/photos.ts
 *
 * Le recadrage utilise la stratégie « attention » de sharp : elle conserve la
 * zone la plus saillante de l'image. C'est ce qui permet de tirer un cadrage
 * paysage d'un original en portrait sans couper le sujet.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp, { type Sharp } from 'sharp'

const SOURCE = path.resolve(process.cwd(), 'photos-a-integrer')
const CIBLE = path.resolve(process.cwd(), 'public', 'photos')

type Photo = {
  /** Nom du fichier déposé. */
  source: string
  /** Emplacement de destination, sans extension. */
  slot: string
  /** Rapport largeur/hauteur du cadrage. */
  ratio: number
  /** Largeurs générées, en pixels. */
  largeurs: number[]
  /**
   * Couleur de fond. Quand elle est donnée, l'image est *contenue* dans le
   * cadre sur ce fond au lieu d'être recadrée pour le remplir — pour un
   * blason ou un logo, dont on ne veut rien rogner. Le fond est aussi
   * aplati dans les formats sans transparence (JPEG).
   */
  fond?: string
}

/**
 * Chaque photo va à un emplacement précis de la page d'accueil. L'ordre suit
 * celui de la page : bandeau, puis les quatre cartes d'arguments, puis l'appel
 * final.
 */
const PHOTOS: Photo[] = [
  {
    /*
     * Photo réelle d'une session du programme, fournie par la Fondation. Elle
     * remplace l'illustration Unsplash : on y voit la promotion, les badges,
     * la salle. Aucune banque d'images ne dit cela.
     *
     * L'original fait 1140 x 380, déjà cadré en bandeau : on garde son rapport
     * 3:1 et on ne dépasse jamais sa largeur native.
     */
    source: 'former_bh.jpg',
    slot: 'heros/accueil',
    ratio: 3,
    largeurs: [640, 900, 1140],
  },
  {
    // Armoiries de la République du Congo, dans l'autocollant rond du héros.
    // Source vectorielle (SVG, 153 Ko) rendue en trame : ~10 Ko à l'écran.
    source: 'armoiries-congo.svg',
    slot: 'heros/armoiries',
    ratio: 1,
    largeurs: [160, 240, 320],
    fond: '#ffffff',
  },
  /*
   * Les trois visuels de la page IA Lab, fournis par la Fondation (543 × 295) :
   * on reste sous leur largeur native, en deux tailles.
   */
  { source: 'ialab-pourquoi.png', slot: 'ialab/pourquoi', ratio: 543 / 295, largeurs: [400, 543] },
  { source: 'ialab-approche.png', slot: 'ialab/approche', ratio: 543 / 295, largeurs: [400, 543] },
  { source: 'ialab-intervention.png', slot: 'ialab/intervention', ratio: 543 / 295, largeurs: [400, 543] },
  {
    source: 'christina-wocintechchat-com-m-6U4n-I2_R2M-unsplash.jpg',
    slot: 'arguments/pratique',
    ratio: 4 / 3,
    largeurs: [400, 640, 900],
  },
  {
    source: 'x-uAcoCc1dKiA-unsplash.jpg',
    slot: 'arguments/telephone',
    ratio: 4 / 3,
    largeurs: [400, 640, 900],
  },
  {
    source: 'x-BVr3XaBiWLU-unsplash.jpg',
    slot: 'arguments/suivi',
    ratio: 4 / 3,
    largeurs: [400, 640, 900],
  },
  {
    source: '1.jpg',
    slot: 'arguments/certificat',
    ratio: 4 / 3,
    largeurs: [400, 640, 900],
  },
  {
    source: 'x-YgOCJz9uGMk-unsplash.jpg',
    slot: 'final/appel',
    ratio: 16 / 9,
    largeurs: [640, 1024, 1600],
  },
]

const FORMATS = [
  { ext: 'avif', encode: (p: Sharp) => p.avif({ quality: 55 }) },
  { ext: 'webp', encode: (p: Sharp) => p.webp({ quality: 72 }) },
  { ext: 'jpg', encode: (p: Sharp) => p.jpeg({ quality: 76, mozjpeg: true }) },
]

/*
 * Logos : celui de la Fondation (en-tête et pied) et la marque FONEA seule,
 * pour le médaillon du héros.
 *
 * Aucune largeur ne dépasse celle du fichier d'origine — au-delà on
 * n'agrandirait que du flou, tout en alourdissant le téléchargement.
 */
const LOGOS = [
  { source: 'logo-bantuhub-blanc.png', slot: 'logo/bantuhub-blanc', largeurs: [150, 225, 300] },
  // Version couleur, pour les fonds blancs et l'impression (le certificat).
  { source: 'LOGO-FONDATION.png', slot: 'logo/fondation', largeurs: [240, 360, 480] },
  // Marque FONEA seule (sans la ligne de texte), pour le médaillon du héros.
  { source: 'logo-fonea.webp', slot: 'logo/fonea-marque', largeurs: [200, 300, 400] },
]

async function genererLogos() {
  await mkdir(path.join(CIBLE, 'logo'), { recursive: true })
  for (const logo of LOGOS) {
    const brut = await readFile(path.join(SOURCE, logo.source)).catch(() => null)
    if (!brut) {
      console.warn(`! ${logo.source} introuvable — logo ignoré.`)
      continue
    }
    let produit = 0
    for (const largeur of logo.largeurs) {
      // PNG uniquement, et à palette. Sur un logo — aplats de couleur et grande
      // zone transparente — la palette bat WebP de loin. Générer du WebP ne
      // ferait qu'ajouter un fichier plus lourd que le navigateur prendrait en
      // premier.
      const png = await sharp(brut)
        .resize(largeur, null, { fit: 'inside' })
        .png({ compressionLevel: 9, palette: true })
        .toBuffer()
      await writeFile(path.join(CIBLE, `${logo.slot}-${largeur}.png`), png)
      produit += png.length
    }
    console.log(
      `= ${logo.slot.padEnd(24)} ${(brut.length / 1024).toFixed(0)} Ko -> ` +
        `${logo.largeurs.length} fichiers PNG (${(produit / 1024).toFixed(0)} Ko)`,
    )
  }
}

async function main() {
  let totalSource = 0
  let totalProduit = 0

  for (const photo of PHOTOS) {
    const chemin = path.join(SOURCE, photo.source)
    const brut = await readFile(chemin).catch(() => null)
    if (!brut) {
      console.warn(`! ${photo.source} introuvable — emplacement ${photo.slot} ignoré.`)
      continue
    }
    totalSource += brut.length

    const dossier = path.join(CIBLE, path.dirname(photo.slot))
    await mkdir(dossier, { recursive: true })
    const base = path.basename(photo.slot)

    for (const largeur of photo.largeurs) {
      const hauteur = Math.round(largeur / photo.ratio)
      for (const format of FORMATS) {
        // `density` ne concerne que les sources vectorielles : sans elle, un
        // SVG serait tramé à la taille de son viewBox puis agrandi, flou.
        // Pas `base` : ce nom est déjà pris au-dessus par le nom de fichier.
        const origine = sharp(brut, { density: 600 }).rotate()
        const pipeline = photo.fond
          ? origine
              .resize(largeur, hauteur, { fit: 'contain', background: photo.fond })
              .flatten({ background: photo.fond })
          : origine.resize(largeur, hauteur, { fit: 'cover', position: sharp.strategy.attention })
        const sortie = await format.encode(pipeline).toBuffer()
        const nom = `${base}-${largeur}.${format.ext}`
        await writeFile(path.join(dossier, nom), sortie)
        totalProduit += sortie.length
      }
    }

    const mo = (brut.length / 1024 / 1024).toFixed(2)
    console.log(`= ${photo.slot.padEnd(24)} ${mo} Mo -> ${photo.largeurs.length * 3} fichiers`)
  }

  await genererLogos()

  const src = (totalSource / 1024 / 1024).toFixed(1)
  const out = (totalProduit / 1024 / 1024).toFixed(1)
  console.log(`\nSources : ${src} Mo — produit : ${out} Mo (toutes largeurs, tous formats).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
