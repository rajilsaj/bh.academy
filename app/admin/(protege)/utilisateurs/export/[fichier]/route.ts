import { sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { toXlsx, xlsxResponse } from '@/lib/xlsx'

export const dynamic = 'force-dynamic'

/**
 * La liste des utilisateurs, en Excel. Deux fichiers : l'équipe (comptes du
 * back-office) et les apprenants. Les requêtes sont figées ici — rien ne vient
 * de l'URL à part le choix du fichier.
 */
const FICHIERS: Record<string, { feuille: string; sql: string }> = {
  equipe: {
    feuille: 'Équipe',
    sql: `select s.email as "E-mail", s.role as "Rôle", t.full_name as "Nom complet",
                 t.phone as "Téléphone", t.linkedin as "LinkedIn", t.website as "Site web",
                 t.linktree as "Linktree", t.socials as "Réseaux sociaux",
                 t.invited_at as "Invité le", t.confirmed_at as "Confirmé le"
          from staff s
          left join trainer_profiles t on t.staff_id = s.id
          order by s.role, s.email`,
  },
  apprenants: {
    feuille: 'Apprenants',
    sql: `select l.id as "Identifiant", l.full_name as "Nom complet", c.name as "Promotion",
                 l.phone as "Téléphone", l.email as "E-mail", l.created_at as "Inscrit le",
                 l.consent_community as "Consentement communauté", l.consent_data as "Consentement données"
          from learners l
          join cohorts c on c.id = l.cohort_id
          order by l.id`,
  },
}

export async function GET(_request: Request, { params }: { params: { fichier: string } }) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  const nom = params.fichier.replace(/\.xlsx$/, '')
  const fichier = FICHIERS[nom]
  if (!fichier) return new Response('Fichier inconnu', { status: 404 })

  const lignes = await db.execute<Record<string, unknown>>(raw.raw(fichier.sql))
  const classeur = await toXlsx([{ nom: fichier.feuille, lignes: Array.from(lignes) }])
  return xlsxResponse(`${nom}.xlsx`, classeur)
}
