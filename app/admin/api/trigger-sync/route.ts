import { NextRequest, NextResponse } from 'next/server'
import { auth, can } from '@/lib/auth'
import { syncLearnersFromGoogleSheets } from '@/lib/sheets-sync'

export const dynamic = 'force-dynamic'

/**
 * Manual trigger for learner sync
 * Admin endpoint to manually trigger Google Sheets sync
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Check authorization
    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.user.role, 'gererUtilisateurs')) {
      return NextResponse.json(
        { error: 'Permission denied.' },
        { status: 403 }
      )
    }

    console.log('[manual-sync] Admin triggered sync')
    const startTime = Date.now()

    const results = await syncLearnersFromGoogleSheets()

    const duration = Date.now() - startTime
    console.log('[manual-sync] Completed in', duration + 'ms', results)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      message: `✅ Sync complete: ${results.created} added, ${results.updated} updated, ${results.skipped} skipped`,
      results,
    })
  } catch (error) {
    console.error('[manual-sync] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    )
  }
}
