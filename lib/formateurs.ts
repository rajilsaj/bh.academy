import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { CITIES, intervientA, programModules, staff, trainerProfiles, type TrainerCity } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { envoyerFichier } from '@/lib/storage'
import { contentTypeFor, extensionOf } from '@/lib/uploads'

/**
 * Les formateurs tels que la vitrine les présente : nom, photo, courte bio,
 * liens publics et modules animés. Les photos ne viennent pas de LinkedIn ni
 * de Facebook — ces réseaux n'autorisent pas la reprise des portraits — mais
 * du back-office, où l'administrateur les dépose ; les liens vers les profils
 * sont affichés à côté.
 */

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024
const EXTENSIONS_PHOTO = new Set(['.jpg', '.jpeg', '.png', '.webp'])

export function photoAcceptee(nom: string): boolean {
  return EXTENSIONS_PHOTO.has(extensionOf(nom))
}

/** Range le portrait sous `formateurs/<staffId>/<uuid><ext>` ; renvoie le chemin. */
export async function enregistrerPhotoFormateur(staffId: string, nomOrigine: string, octets: Buffer): Promise<string> {
  const chemin = `formateurs/${staffId}/${randomUUID()}${extensionOf(nomOrigine)}`
  return envoyerFichier(chemin, octets, contentTypeFor(chemin))
}

export type FormateurPublic = {
  id: string
  nom: string
  bio: string | null
  linkedin: string | null
  facebook: string | null
  website: string | null
  linktree: string | null
  aPhoto: boolean
  modules: string[]
}

/** Les formateurs confirmés, dans l'ordre alphabétique, avec leurs modules. */
export async function getFormateursPublics(): Promise<FormateurPublic[]> {
  const lignes = await db
    .select({
      id: staff.id,
      nom: trainerProfiles.fullName,
      bio: trainerProfiles.bio,
      linkedin: trainerProfiles.linkedin,
      facebook: trainerProfiles.facebook,
      website: trainerProfiles.website,
      linktree: trainerProfiles.linktree,
      photoPath: trainerProfiles.photoPath,
      module: programModules.title,
      position: programModules.position,
    })
    .from(trainerProfiles)
    .innerJoin(staff, eq(staff.id, trainerProfiles.staffId))
    .leftJoin(programModules, eq(programModules.trainerId, staff.id))
    .where(eq(staff.role, 'formateur'))
    .orderBy(asc(trainerProfiles.fullName), asc(programModules.position))

  const parId = new Map<string, FormateurPublic>()
  for (const l of lignes) {
    let f = parId.get(l.id)
    if (!f) {
      f = {
        id: l.id,
        nom: l.nom,
        bio: l.bio,
        linkedin: l.linkedin,
        facebook: l.facebook,
        website: l.website,
        linktree: l.linktree,
        aPhoto: Boolean(l.photoPath),
        modules: [],
      }
      parId.set(l.id, f)
    }
    if (l.module && !f.modules.includes(l.module)) f.modules.push(l.module)
  }
  return [...parId.values()]
}

/** Initiales pour l'avatar de repli : « Aimé Loubaki » → « AL ». */
export function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join('')
}

/** « Brazzaville : 5 · Pointe-Noire : 3 · Sans ville : 2 » — un formateur des deux villes compte dans chacune. */
export function repartitionParVille(formateurs: { city: TrainerCity | null }[]): string {
  const t = fr.admin.formateurs
  const parVille = CITIES.map((ville) => t.parVille.replace('{ville}', ville).replace('{n}', String(formateurs.filter((f) => intervientA(f.city, ville)).length)))
  const sansVille = formateurs.filter((f) => !f.city).length
  return [...parVille, ...(sansVille > 0 ? [t.sansVille.replace('{n}', String(sansVille))] : [])].join(' · ')
}

/** Le filtre par ville de la liste des formateurs : toutes, l'une des deux, ou ceux sans ville. */
export const FILTRES_VILLE = ['tous', ...CITIES, 'sans'] as const
export type FiltreVille = (typeof FILTRES_VILLE)[number]

export function filtreVilleDepuis(param: string | undefined): FiltreVille {
  return FILTRES_VILLE.find((f) => f === param) ?? 'tous'
}

/** Les formateurs retenus par le filtre ; un formateur des deux villes répond aux deux. */
export function filtrerParVille<T extends { city: TrainerCity | null }>(formateurs: T[], filtre: FiltreVille): T[] {
  if (filtre === 'tous') return formateurs
  if (filtre === 'sans') return formateurs.filter((f) => !f.city)
  return formateurs.filter((f) => intervientA(f.city, filtre))
}

/** Le libellé du filtre, pour les onglets et le sous-titre du PDF. */
export function libelleFiltreVille(filtre: FiltreVille): string {
  const t = fr.admin.formateurs
  if (filtre === 'tous') return t.filtreTous
  if (filtre === 'sans') return t.filtreSansVille
  return filtre
}

/** Le nom du fichier téléchargé : « formateurs-brazzaville.pdf ». */
export function nomFichierFormateurs(filtre: FiltreVille, extension: 'xlsx' | 'pdf'): string {
  const suffixe = filtre === 'tous' ? '' : `-${filtre.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`
  return `formateurs${suffixe}.${extension}`
}
