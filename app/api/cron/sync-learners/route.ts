import { NextRequest, NextResponse } from 'next/server'
import { syncLearnersFromGoogleSheets } from '@/lib/sheets-sync'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint for automatic learner sync from Google Sheets
 * Scheduled daily at 07:00 AM UTC
 * Called by Vercel Cron
 */
export async function GET(request: NextRequest) {
  // Verify this is a cron request from Vercel
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[cron:sync-learners] Starting scheduled sync...')
    const startTime = Date.now()

    const results = await syncLearnersFromGoogleSheets()

    const duration = Date.now() - startTime
    console.log('[cron:sync-learners] Sync completed in', duration + 'ms', {
      total: results.total,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      errors: results.errors.length,
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      message: `Sync: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      results,
    })
  } catch (error) {
    console.error('[cron:sync-learners] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    )
  }
}
