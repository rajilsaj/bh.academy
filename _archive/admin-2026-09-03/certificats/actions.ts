'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import { certificates } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { generateCertificateCode } from '@/lib/ids'
import { fr } from '@/lib/i18n/fr'

/**
 * Délivrance d'un certificat. Deux garde-fous côté serveur :
 * l'éligibilité est relue en base au moment du clic (jamais depuis le
 * formulaire), et le pourcentage est figé à cet instant — un certificat déjà
 * remis ne doit pas changer parce qu'une session a été ajoutée après coup.
 */
export async function delivrerCertificat(formData: FormData) {
  const session = await requirePermission('gererResultats')
  if (!session) redirect('/admin')

  const learnerId = String(formData.get('learnerId') ?? '')
  if (!learnerId) redirect('/admin/certificats')

  const rows = await db.execute<{ eligible: boolean; avancement: string | null }>(raw`
    select eligible, avancement from v_certificate_eligibility where learner_id = ${learnerId}
  `)
  const eligibilite = rows[0]
  if (!eligibilite?.eligible) redirect('/admin/certificats?e=non_eligible')

  const annee = new Date().getFullYear()

  // Collision de code quasi impossible, mais la contrainte d'unicité tranche.
  for (let essai = 0; essai < 5; essai++) {
    try {
      await db.insert(certificates).values({
        learnerId,
        code: generateCertificateCode(annee),
        title: fr.backoffice.certificatTitreDefaut,
        progressPct: String(eligibilite.avancement ?? '0'),
        issuedOn: new Date().toISOString().slice(0, 10),
        issuedBy: session.user.id,
      })
      break
    } catch (error) {
      // Déjà délivré : la contrainte d'unicité sur learner_id a joué son rôle.
      if (String(error).includes('certificates_learner_unique')) break
      if (essai === 4) throw error
    }
  }

  revalidatePath('/admin/certificats')
  revalidatePath('/admin')
  redirect('/admin/certificats?ok=1')
}
