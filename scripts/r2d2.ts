/**
 * Prépare le modèle 3D de R2-D2 pour le web.
 *
 * Le dossier d'origine pèse 138 Mo — presque tout en textures PNG 4096²
 * non compressées. Rien de cela ne peut être servi. Ce script :
 *   - copie le FBX (1,5 Mo) tel quel dans `public/3d/r2d2/` ;
 *   - réduit les cinq textures utiles en WebP, 1024² pour la couleur et les
 *     normales, 512² pour rugosité, métal et émission — quelques centaines de
 *     Ko en tout. Height et ColorID ne servent pas au rendu : ignorées.
 *
 * Les originaux restent hors du dépôt (138 Mo n'ont rien à faire dans Git) :
 * le chemin source est celui de la machine, surchargeable par R2D2_SOURCE.
 *
 *   npx tsx scripts/r2d2.ts
 */
import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SOURCE = process.env.R2D2_SOURCE ?? 'C:/Users/jeanv/Downloads/R2-D2'
const CIBLE = path.resolve(process.cwd(), 'public', '3d', 'r2d2')

const TEXTURES = [
  { source: 'R2D2_BaseColor.png', nom: 'basecolor', taille: 1024, qualite: 82 },
  // Les normales supportent mal la compression : qualité haute.
  { source: 'R2D2_NormalMap.png', nom: 'normal', taille: 1024, qualite: 92 },
  { source: 'R2D2_Roughness.png', nom: 'roughness', taille: 512, qualite: 80 },
  { source: 'R2D2_Metallic.png', nom: 'metallic', taille: 512, qualite: 80 },
  { source: 'R2D2_Emissive.png', nom: 'emissive', taille: 512, qualite: 80 },
]

async function main() {
  await mkdir(path.join(CIBLE, 'textures'), { recursive: true })

  const fbx = path.join(CIBLE, 'R2-D2.fbx')
  await copyFile(path.join(SOURCE, 'R2-D2.fbx'), fbx)
  console.log(`= R2-D2.fbx  ${((await stat(fbx)).size / 1024).toFixed(0)} Ko`)

  let total = 0
  for (const t of TEXTURES) {
    const sortie = path.join(CIBLE, 'textures', `${t.nom}.webp`)
    await sharp(path.join(SOURCE, 'Textures', t.source))
      .resize(t.taille, t.taille, { fit: 'fill' })
      .webp({ quality: t.qualite })
      .toFile(sortie)
    const ko = (await stat(sortie)).size / 1024
    total += ko
    console.log(`= ${t.nom.padEnd(10)} ${t.taille}²  ${ko.toFixed(0)} Ko`)
  }
  console.log(`\nTextures : ${(total / 1024).toFixed(2)} Mo au total (contre 130 Mo en PNG 4096²).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
