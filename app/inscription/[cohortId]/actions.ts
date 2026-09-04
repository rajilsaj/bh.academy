'use server'

import { redirect } from 'next/navigation'
import { eq, sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cohorts, learners, responses, waves } from '@/lib/db/schema'
import { formatLearnerId, generateLearnerToken } from '@/lib/ids'
import { identiteGoogle, signIn, signOut } from '@/lib/auth'
import { lireFormData, schemaInscription, type CodeErreur } from '@/lib/inscription'

/** Le code d'erreur du schéma devient le paramètre `e` de l'URL de retour. */
const RETOURS: Record<CodeErreur, string> = {
  requis: 'manquant',
  trop_long: 'manquant',
  telephone: 'telephone',
  email: 'email',
  consent: 'consent',
}

/** Étape 1 : Google. La personne revient sur cette même page, identifiée. */
export async function connexionGoogleInscription(formData: FormData) {
  const cohortId = String(formData.get('cohortId') ?? '')
  await signIn('google', { redirectTo: `/inscription/${cohortId}` })
}

/** « Ce n'est pas vous ? » : on oublie la session et on revient à l'étape Google. */
export async function changerCompteInscription(formData: FormData) {
  const cohortId = String(formData.get('cohortId') ?? '')
  await signOut({ redirectTo: `/inscription/${cohortId}` })
}

export async function inscrire(formData: FormData) {
  const cohortId = String(formData.get('cohortId') ?? '')
  const base = `/inscription/${cohortId}`
  function back(query: string): never {
    redirect(`${base}?${query}`)
  }

  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1)
  if (!cohort) back('e=cohorte')

  // Google d'abord : sans identité vérifiée, pas d'inscription.
  const google = await identiteGoogle()
  if (!google) back('e=google')

  // Déjà inscrit avec ce compte Google : on renvoie le lien personnel existant.
  const [deja] = await db.select({ token: learners.token }).from(learners).where(eq(learners.googleSub, google.sub)).limit(1)
  if (deja) redirect(`${base}?nouveau=${deja.token}&deja=1`)

  // Le même schéma que le navigateur : ce qui passe côté client repasse ici.
  const resultat = schemaInscription.safeParse({ ...lireFormData(formData), email: google.email })
  if (!resultat.success) {
    const code = (resultat.error.issues[0]?.message ?? 'requis') as CodeErreur
    back(`e=${RETOURS[code] ?? 'manquant'}`)
  }
  const { fullName, phone, statut, outils, confiance, objectif, consentCommunity, consentData } = resultat.data

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
        phone: phone || null,
        email: google.email,
        googleSub: google.sub,
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
