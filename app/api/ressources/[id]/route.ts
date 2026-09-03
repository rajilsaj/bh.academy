import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { resources } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { reponseRessource } from '@/lib/ressources'

export const dynamic = 'force-dynamic'

/** Ouverture d'une ressource de cours par le personnel connecté (sans points). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('voirTableauBord')
  if (!session) return new Response('Accès refusé', { status: 403 })
  const [r] = await db.select().from(resources).where(eq(resources.id, params.id)).limit(1)
  if (!r) return new Response('Introuvable', { status: 404 })
  return reponseRessource(r)
}
