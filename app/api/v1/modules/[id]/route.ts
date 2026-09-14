import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { modules } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('voirTableauBord')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const [module] = await db.select().from(modules).where(eq(modules.id, params.id)).limit(1)
    if (!module) return new Response('Module not found', { status: 404 })

    return Response.json(module)
  } catch (error) {
    console.error('Get module error:', error)
    return Response.json(
      { error: 'Failed to fetch module', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const body = await request.json()

    const [module] = await db
      .update(modules)
      .set({
        code: body.code,
        title: body.title,
        durationHours: body.durationHours,
        description: body.description || null,
        maxLearners: body.maxLearners || null,
        requiredSkills: body.requiredSkills || [],
        prerequisites: body.prerequisites || [],
        programId: body.programId || null,
        updatedAt: new Date(),
      })
      .where(eq(modules.id, params.id))
      .returning()

    if (!module) return new Response('Module not found', { status: 404 })

    return Response.json(module)
  } catch (error) {
    console.error('Update module error:', error)
    return Response.json(
      { error: 'Failed to update module', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const [module] = await db
      .delete(modules)
      .where(eq(modules.id, params.id))
      .returning()

    if (!module) return new Response('Module not found', { status: 404 })

    return Response.json({ success: true, module })
  } catch (error) {
    console.error('Delete module error:', error)
    return Response.json(
      { error: 'Failed to delete module', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
