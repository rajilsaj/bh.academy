import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { resources } from '@/lib/db/schema'
import { crediter } from '@/lib/points'
import { getLearnerByToken } from '@/lib/queries'
import { reponseRessource } from '@/lib/ressources'

export const dynamic = 'force-dynamic'

/** Ouverture d'une ressource par l'apprenant : les points sont crédités, une fois. */
export async function GET(_request: Request, { params }: { params: { token: string; id: string } }) {
  const learner = await getLearnerByToken(params.token)
  if (!learner) return new Response('Lien invalide', { status: 403 })
  const [r] = await db.select().from(resources).where(eq(resources.id, params.id)).limit(1)
  if (!r) return new Response('Introuvable', { status: 404 })
  try {
    await crediter({ learnerId: learner.id, moduleId: r.moduleId, source: 'ressource', refId: r.id, points: r.points })
  } catch (erreur) {
    console.error('[points] ressource :', erreur)
  }
  return reponseRessource(r)
}
