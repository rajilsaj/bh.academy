import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { modules } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await requirePermission('voirTableauBord')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const allModules = await db.select().from(modules)
    return Response.json(allModules)
  } catch (error) {
    console.error('Get modules error:', error)
    return Response.json(
      { error: 'Failed to fetch modules', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const body = await request.json()

    if (!body.code || !body.title) {
      return new Response('Code and title are required', { status: 400 })
    }

    const [module] = await db
      .insert(modules)
      .values({
        code: body.code,
        title: body.title,
        durationHours: body.durationHours || 0,
        description: body.description || null,
        maxLearners: body.maxLearners || null,
        requiredSkills: body.requiredSkills || [],
        prerequisites: body.prerequisites || [],
        programId: body.programId || null,
      })
      .returning()

    return Response.json(module, { status: 201 })
  } catch (error) {
    console.error('Create module error:', error)
    return Response.json(
      { error: 'Failed to create module', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
