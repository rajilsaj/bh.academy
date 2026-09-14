import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { trainers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getTrainer } from '@/lib/training/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('voirTableauBord')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const trainer = await getTrainer(params.id)
    if (!trainer) return new Response('Trainer not found', { status: 404 })

    return Response.json(trainer)
  } catch (error) {
    console.error('Get trainer error:', error)
    return Response.json(
      { error: 'Failed to fetch trainer', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const body = await request.json()

    const [trainer] = await db
      .update(trainers)
      .set({
        fullName: body.fullName,
        phone: body.phone || null,
        city: body.city || null,
        skills: body.skills || [],
        availabilityWindows: body.availabilityWindows || [],
        status: body.status || 'actif',
        site: body.site || null,
        updatedAt: new Date(),
      })
      .where(eq(trainers.id, params.id))
      .returning()

    if (!trainer) return new Response('Trainer not found', { status: 404 })

    return Response.json(trainer)
  } catch (error) {
    console.error('Update trainer error:', error)
    return Response.json(
      { error: 'Failed to update trainer', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const [trainer] = await db
      .delete(trainers)
      .where(eq(trainers.id, params.id))
      .returning()

    if (!trainer) return new Response('Trainer not found', { status: 404 })

    return Response.json({ success: true, trainer })
  } catch (error) {
    console.error('Delete trainer error:', error)
    return Response.json(
      { error: 'Failed to delete trainer', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
