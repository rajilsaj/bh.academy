import { NextRequest, NextResponse } from 'next/server'
import { auth, can } from '@/lib/auth'
import { db } from '@/lib/db'
import { learners } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Check authorization
    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.user.role, 'gererUtilisateurs')) {
      return NextResponse.json(
        { error: 'Permission denied. Only admins can validate learners.' },
        { status: 403 }
      )
    }

    const { ids, action } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
    }

    if (action === 'validate') {
      // Set validatedAt to current date
      await db
        .update(learners)
        .set({ validatedAt: new Date() })
        .where(inArray(learners.id, ids))
    } else if (action === 'reject') {
      // Delete learners
      await db
        .delete(learners)
        .where(inArray(learners.id, ids))
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} apprenant(s) ${action === 'validate' ? 'approuvé(s)' : 'rejeté(s)'}`,
      count: ids.length,
    })
  } catch (error) {
    console.error('[bulk-validate]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Bulk validation failed',
      },
      { status: 500 }
    )
  }
}
