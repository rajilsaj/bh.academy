import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { affectations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { canRemoveAffectation } from '@/lib/training/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('voirTableauBord')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const [affectation] = await db
      .select()
      .from(affectations)
      .where(eq(affectations.id, params.id))
      .limit(1)

    if (!affectation) return new Response('Affectation not found', { status: 404 })

    return Response.json(affectation)
  } catch (error) {
    console.error('Get affectation error:', error)
    return Response.json(
      { error: 'Failed to fetch affectation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const body = await request.json()

    const [existing] = await db
      .select()
      .from(affectations)
      .where(eq(affectations.id, params.id))
      .limit(1)

    if (!existing) return new Response('Affectation not found', { status: 404 })

    const statusHistory = existing.statusHistory || []
    if (body.status && body.status !== existing.status) {
      statusHistory.push({
        status: body.status,
        timestamp: new Date().toISOString(),
        changedBy: session.user?.id || 'unknown',
      })
    }

    const [updated] = await db
      .update(affectations)
      .set({
        status: body.status || existing.status,
        conflictReason: body.conflictReason || null,
        statusHistory,
        confirmedAt: body.status === 'confirmé' ? new Date() : existing.confirmedAt,
        refusedAt: body.status === 'refusé' ? new Date() : existing.refusedAt,
        updatedAt: new Date(),
      })
      .where(eq(affectations.id, params.id))
      .returning()

    return Response.json(updated)
  } catch (error) {
    console.error('Update affectation error:', error)
    return Response.json(
      { error: 'Failed to update affectation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const canRemove = await canRemoveAffectation(params.id)
    if (!canRemove) {
      return new Response('Can only delete affectations with status "proposé"', { status: 400 })
    }

    const [deleted] = await db
      .delete(affectations)
      .where(eq(affectations.id, params.id))
      .returning()

    if (!deleted) return new Response('Affectation not found', { status: 404 })

    return Response.json({ success: true, affectation: deleted })
  } catch (error) {
    console.error('Delete affectation error:', error)
    return Response.json(
      { error: 'Failed to delete affectation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
