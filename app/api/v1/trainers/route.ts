import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { trainers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getAllTrainers } from '@/lib/training/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await requirePermission('voirTableauBord')
  if (!session) return new Response('Accès refusé', { status: 403 })

  const url = new URL(request.url)
  const skill = url.searchParams.get('skill')
  const city = url.searchParams.get('city')
  const status = url.searchParams.get('status')

  try {
    const allTrainers = await getAllTrainers({
      skill: skill || undefined,
      city: city || undefined,
      status: status || undefined,
    })

    return Response.json(allTrainers)
  } catch (error) {
    console.error('Get trainers error:', error)
    return Response.json(
      { error: 'Failed to fetch trainers', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const body = await request.json()

    if (!body.email || !body.fullName) {
      return new Response('Email and fullName are required', { status: 400 })
    }

    const [trainer] = await db
      .insert(trainers)
      .values({
        email: body.email.toLowerCase(),
        fullName: body.fullName,
        phone: body.phone || null,
        city: body.city || null,
        skills: body.skills || [],
        availabilityWindows: body.availabilityWindows || [],
        status: body.status || 'actif',
        site: body.site || null,
        source: 'manuel',
        externalRef: null,
      })
      .returning()

    return Response.json(trainer, { status: 201 })
  } catch (error) {
    console.error('Create trainer error:', error)
    return Response.json(
      { error: 'Failed to create trainer', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
