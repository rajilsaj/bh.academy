'use server'

import { redirect } from 'next/navigation'
import { eq, sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cohorts, learners, responses, waves } from '@/lib/db/schema'
import { formatLearnerId, generateLearnerToken } from '@/lib/ids'
import { fr } from '@/lib/i18n/fr'

const STATUTS = Object.keys(fr.inscription.statutOptions)
const OUTILS = Object.keys(fr.inscription.outilsOptions)

/** Accepte 9 chiffres locaux ou un format international. */
function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length < 9 || digits.length > 15) return null
  return input.trim()
}

export async function inscrire(formData: FormData) {
  const cohortId = String(formData.get('cohortId') ?? '')
  const fullName = String(formData.get('fullName') ?? '').trim()
  const phoneRaw = String(formData.get('phone') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const statut = String(formData.get('statut') ?? '')
  const confiance = Number(formData.get('confiance'))
  const objectif = String(formData.get('objectif') ?? '').trim()
  const outils = formData.getAll('outils').map(String).filter((o) => OUTILS.includes(o))
  const consentCommunity = formData.get('consentCommunity') === 'on'
  const consentData = formData.get('consentData') === 'on'

  const base = `/inscription/${cohortId}`
  function back(query: string): never {
    redirect(`${base}?${query}`)
  }

  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1)
  if (!cohort) back('e=cohorte')

  if (!fullName || !statut || !STATUTS.includes(statut) || !objectif) back('e=manquant')
  if (!Number.isInteger(confiance) || confiance < 1 || confiance > 5) back('e=manquant')
  if (!consentData) back('e=consent')

  const phone = phoneRaw ? normalizePhone(phoneRaw) : null
  if (phoneRaw && !phone) back('e=telephone')

  // Identifiant lisible séquentiel. En cas de collision (deux inscriptions
  // simultanées) on retente : la clé primaire garantit l'unicité.
  const token = generateLearnerToken()
  let learnerId = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    // Classe de caractères explicite plutôt que \D : dans un littéral de gabarit
    // JavaScript, la barre oblique inverse disparaîtrait avant d'atteindre SQL.
    const [{ next }] = await db.execute<{ next: number }>(raw`
      select coalesce(max((regexp_replace(id, '[^0-9]', '', 'g'))::int), 0) + 1 as next
      from learners
    `)
    learnerId = formatLearnerId(Number(next))
    try {
      await db.insert(learners).values({
        id: learnerId,
        cohortId,
        fullName,
        phone,
        email: email || null,
        token,
        consentCommunity,
        consentData,
      })
      break
    } catch (error) {
      if (attempt === 4) throw error
    }
  }

  // La situation de départ est stockée comme la réponse à la vague J0 :
  // c'est le même objet que les suivis mensuels, donc comparable dans le temps.
  const [j0] = await db.select().from(waves).where(eq(waves.code, 'J0')).limit(1)
  if (j0) {
    await db
      .insert(responses)
      .values({
        learnerId,
        waveId: j0.id,
        payload: {
          situation: statut,
          outils_ia: outils,
          confiance,
          objectif,
        },
      })
      .onConflictDoNothing()
  }

  redirect(`${base}?nouveau=${token}`)
}
