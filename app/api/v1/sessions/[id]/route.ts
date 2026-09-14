import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { sessions, modules } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/training/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('voirTableauBord')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const sessionData = await getSession(params.id)
    if (!sessionData) return new Response('Session not found', { status: 404 })

    return Response.json(sessionData)
  } catch (error) {
    console.error('Get session error:', error)
    return Response.json(
      { error: 'Failed to fetch session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const body = await request.json()

    const [updated] = await db
      .update(sessions)
      .set({
        moduleId: body.moduleId,
        opensAt: body.opensAt ? new Date(body.opensAt) : undefined,
        closesAt: body.closesAt ? new Date(body.closesAt) : undefined,
        status: body.status,
        roomLocation: body.roomLocation || null,
        canceledReason: body.canceledReason || null,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, params.id))
      .returning()

    if (!updated) return new Response('Session not found', { status: 404 })

    const result = await getSession(params.id)
    return Response.json(result)
  } catch (error) {
    console.error('Update session error:', error)
    return Response.json(
      { error: 'Failed to update session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const [deleted] = await db
      .delete(sessions)
      .where(eq(sessions.id, params.id))
      .returning()

    if (!deleted) return new Response('Session not found', { status: 404 })

    return Response.json({ success: true, session: deleted })
  } catch (error) {
    console.error('Delete session error:', error)
    return Response.json(
      { error: 'Failed to delete session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
