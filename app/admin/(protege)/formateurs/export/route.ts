import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { staff, trainerProfiles } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { fr } from '@/lib/i18n/fr'
import { toXlsx, xlsxResponse } from '@/lib/xlsx'

export const dynamic = 'force-dynamic'

/**
 * La liste des formateurs en Excel : nom, LinkedIn, site web, téléphone,
 * profil (la courte présentation) et ville. Une ligne par formateur, dans
 * l'ordre alphabétique.
 */
export async function GET() {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  const e = fr.admin.formateurs.excel
  const formateurs = await db
    .select({
      nom: trainerProfiles.fullName,
      linkedin: trainerProfiles.linkedin,
      website: trainerProfiles.website,
      phone: trainerProfiles.phone,
      bio: trainerProfiles.bio,
      city: trainerProfiles.city,
    })
    .from(trainerProfiles)
    .innerJoin(staff, eq(staff.id, trainerProfiles.staffId))
    .where(eq(staff.role, 'formateur'))
    .orderBy(asc(trainerProfiles.fullName))

  const colonnes = [e.nom, e.linkedin, e.siteWeb, e.telephone, e.profil, e.ville]
  const lignes = formateurs.map((f) => ({
    [e.nom]: f.nom,
    [e.linkedin]: f.linkedin,
    [e.siteWeb]: f.website,
    [e.telephone]: f.phone,
    [e.profil]: f.bio,
    [e.ville]: f.city,
  }))
  const classeur = await toXlsx([{ nom: e.feuille, lignes, colonnes }])
  return xlsxResponse('formateurs.xlsx', classeur)
}
