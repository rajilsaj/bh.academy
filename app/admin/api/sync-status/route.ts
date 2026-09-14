import { NextResponse } from 'next/server'

// In-memory store for last sync (in production, use a database)
let lastSyncInfo = {
  timestamp: null as Date | null,
  status: 'pending' as 'pending' | 'running' | 'success' | 'error',
  message: '',
  results: {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  },
}

export async function GET() {
  const nextSync = calculateNextSync()

  return NextResponse.json({
    lastSync: lastSyncInfo.timestamp ? {
      timestamp: lastSyncInfo.timestamp,
      status: lastSyncInfo.status,
      message: lastSyncInfo.message,
      results: lastSyncInfo.results,
    } : null,
    nextSync,
    schedule: 'Every 15 minutes',
  })
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    lastSyncInfo = {
      timestamp: new Date(data.timestamp),
      status: data.status,
      message: data.message,
      results: data.results,
    }

    return NextResponse.json({
      success: true,
      lastSync: lastSyncInfo,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update sync status' },
      { status: 400 }
    )
  }
}

function calculateNextSync() {
  const now = new Date()
  const minutesUntilNext = 15 - (now.getMinutes() % 15)
  return new Date(now.getTime() + minutesUntilNext * 60000)
}
