import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { staff, trainerProfiles } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { filtrerParVille, filtreVilleDepuis, libelleFiltreVille, nomFichierFormateurs, repartitionParVille } from '@/lib/formateurs'
import { fr } from '@/lib/i18n/fr'
import { pdfResponse, tableauPdf } from '@/lib/pdf'
import { toXlsx, xlsxResponse } from '@/lib/xlsx'

export const dynamic = 'force-dynamic'

/**
 * La liste des formateurs à télécharger : nom, ville, téléphone, LinkedIn,
 * site web et profil (la courte présentation). En Excel par défaut, en PDF
 * avec `?format=pdf` ; `?ville=` restreint à une ville, comme sur la page.
 * Un téléphone inconnu se lit « À chercher ». Une ligne par formateur, dans
 * l'ordre alphabétique.
 */
export async function GET(request: Request) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  const params = new URL(request.url).searchParams
  const filtre = filtreVilleDepuis(params.get('ville') ?? undefined)
  const t = fr.admin.formateurs
  const e = t.excel
  const tous = await db
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
  const formateurs = filtrerParVille(tous, filtre)

  const telephone = (f: { phone: string | null }) => f.phone ?? t.telephoneAChercher
  /* Dans le PDF, un lien se lit sans son préfixe technique. */
  const lien = (url: string | null) => (url ?? '').replace(/^https?:\/\/(www\.)?/, '')

  if (params.get('format') === 'pdf') {
    const pdf = await tableauPdf({
      titre: t.pdf.titre,
      sousTitre: `${t.pdf.compte.replace('{n}', String(formateurs.length))} · ${filtre === 'tous' ? repartitionParVille(formateurs) : libelleFiltreVille(filtre)}`,
      pied: t.pdf.pied.replace('{date}', formatDate(new Date())),
      page: t.pdf.page,
      colonnes: [
        { titre: e.nom, largeur: 16 },
        { titre: e.ville, largeur: 15 },
        { titre: e.telephone, largeur: 11 },
        { titre: e.linkedin, largeur: 17 },
        { titre: e.siteWeb, largeur: 12 },
        { titre: e.profil, largeur: 29 },
      ],
      lignes: formateurs.map((f) => [f.nom, f.city ?? '', telephone(f), lien(f.linkedin), lien(f.website), f.bio ?? '']),
    })
    return pdfResponse(nomFichierFormateurs(filtre, 'pdf'), pdf)
  }

  const colonnes = [e.nom, e.linkedin, e.siteWeb, e.telephone, e.profil, e.ville]
  const lignes = formateurs.map((f) => ({
    [e.nom]: f.nom,
    [e.linkedin]: f.linkedin,
    [e.siteWeb]: f.website,
    [e.telephone]: telephone(f),
    [e.profil]: f.bio,
    [e.ville]: f.city,
  }))
  const classeur = await toXlsx([{ nom: e.feuille, lignes, colonnes }])
  return xlsxResponse(nomFichierFormateurs(filtre, 'xlsx'), classeur)
}
