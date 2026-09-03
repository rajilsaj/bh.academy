'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { responses } from '@/lib/db/schema'
import { getLearnerByToken, getWaveByCode } from '@/lib/queries'
import { parseSuiviPayload } from '@/lib/suivi'

export async function enregistrerSuivi(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const waveCode = String(formData.get('waveCode') ?? '')

  const learner = await getLearnerByToken(token)
  if (!learner) redirect('/')

  const base = `/l/${learner.token}/suivi/${waveCode}`
  function back(query: string): never {
    redirect(query ? `${base}?${query}` : base)
  }

  const wave = await getWaveByCode(waveCode)
  if (!wave) back('e=inconnue')

  const now = Date.now()
  if (!wave.opensAt || wave.opensAt.getTime() > now) back('e=pasOuverte')
  if (wave.closesAt && wave.closesAt.getTime() <= now) back('e=fermee')

  const { payload, missing } = parseSuiviPayload(formData)
  if (missing.length > 0) back('e=manquant')

  await db
    .insert(responses)
    .values({ learnerId: learner.id, waveId: wave.id, payload })
    .onConflictDoNothing()

  back('ok=1')
}
