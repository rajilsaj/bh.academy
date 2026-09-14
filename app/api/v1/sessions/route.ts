import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { sessions } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await requirePermission('voirTableauBord')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const allSessions = await db.select().from(sessions)
    return Response.json(allSessions)
  } catch (error) {
    console.error('Get sessions error:', error)
    return Response.json(
      { error: 'Failed to fetch sessions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const body = await request.json()

    if (!body.moduleId || !body.opensAt || !body.closesAt) {
      return new Response('moduleId, opensAt, and closesAt are required', { status: 400 })
    }

    const [newSession] = await db
      .insert(sessions)
      .values({
        moduleId: body.moduleId,
        opensAt: new Date(body.opensAt),
        closesAt: new Date(body.closesAt),
        status: body.status || 'planifiée',
        roomLocation: body.roomLocation || null,
        canceledReason: body.canceledReason || null,
      })
      .returning()

    return Response.json(newSession, { status: 201 })
  } catch (error) {
    console.error('Create session error:', error)
    return Response.json(
      { error: 'Failed to create session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
