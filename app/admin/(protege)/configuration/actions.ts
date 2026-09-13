'use server'

import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function updateSetting(key: string, value: string) {
  try {
    // Try to update
    const result = await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))

    // If nothing was updated, insert
    if (result.count === 0) {
      await db.insert(settings).values({ key, value })
    }

    return { success: true }
  } catch (error) {
    throw new Error(`Failed to update setting: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).limit(1)
  return row?.value ?? null
}
