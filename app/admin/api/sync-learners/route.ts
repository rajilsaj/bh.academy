import { NextRequest, NextResponse } from 'next/server'
import { auth, can } from '@/lib/auth'
import { syncLearnersFromGoogleSheets } from '@/lib/sheets-sync'

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
        { error: 'Permission denied. Only admins can sync learners.' },
        { status: 403 }
      )
    }

    // Run sync
    const results = await syncLearnersFromGoogleSheets()

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${results.created} created, ${results.skipped} skipped`,
      results,
    })
  } catch (error) {
    console.error('[sync-learners]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    )
  }
}
