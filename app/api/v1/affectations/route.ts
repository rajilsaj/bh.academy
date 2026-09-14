import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { affectations } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await requirePermission('voirTableauBord')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')

    if (sessionId) {
      const sessionAffectations = await db
        .select()
        .from(affectations)
        .where((f) => f.sessionId === sessionId)

      return Response.json(sessionAffectations)
    }

    const allAffectations = await db.select().from(affectations)
    return Response.json(allAffectations)
  } catch (error) {
    console.error('Get affectations error:', error)
    return Response.json(
      { error: 'Failed to fetch affectations', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const body = await request.json()

    if (!body.sessionId || !body.trainerId || !body.role) {
      return new Response('sessionId, trainerId, and role are required', { status: 400 })
    }

    const [affectation] = await db
      .insert(affectations)
      .values({
        sessionId: body.sessionId,
        trainerId: body.trainerId,
        role: body.role,
        status: body.status || 'proposé',
        statusHistory: [
          {
            status: body.status || 'proposé',
            timestamp: new Date().toISOString(),
            changedBy: session.user?.id || 'unknown',
          },
        ],
        conflictReason: body.conflictReason || null,
        createdAt: new Date(),
      })
      .returning()

    return Response.json(affectation, { status: 201 })
  } catch (error) {
    console.error('Create affectation error:', error)
    return Response.json(
      { error: 'Failed to create affectation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
