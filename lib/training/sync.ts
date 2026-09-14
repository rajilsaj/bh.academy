/**
 * Trainer sync adapters for Google Sheets and XLSX
 * Handles parsing, validation, conflict detection, and idempotent upsert
 */

import { db } from '../db'
import { trainers, importRuns } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { TrainerSource, ImportStatus } from '../db/schema'

/**
 * Raw row from Google Sheets or XLSX
 */
export interface RawTrainerRow {
  externalRef?: string
  email: string
  fullName: string
  phone?: string
  city?: string
  skills?: string[] | string // CSV or array
  availabilityJson?: string
  status?: string
  site?: string
}

/**
 * Parsed and validated trainer record ready for upsert
 */
export interface ParsedTrainer {
  externalRef: string | null
  email: string
  fullName: string
  phone: string | null
  city: string | null
  skills: string[]
  availabilityWindows: any[] // AvailabilityWindow[]
  status: string
  site: string | null
  source: TrainerSource
}

/**
 * Result of a sync operation (dry run or committed)
 */
export interface SyncResult {
  created: ParsedTrainer[]
  updated: { previous: ParsedTrainer; current: ParsedTrainer }[]
  unchanged: ParsedTrainer[]
  rejected: { row: RawTrainerRow; reason: string }[]
  conflicts: {
    trainerId: string
    email: string
    fieldConflicts: Array<{ field: string; imported: any; current: any }>
  }[]
}

/**
 * Parse and normalize skills (handle CSV strings or arrays)
 */
function parseSkills(skillsInput: string[] | string | undefined): string[] {
  if (!skillsInput) return []
  if (Array.isArray(skillsInput)) return skillsInput.filter((s) => s && typeof s === 'string')
  if (typeof skillsInput === 'string') {
    return skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s)
  }
  return []
}

/**
 * Parse availability windows from JSON string
 */
function parseAvailabilityWindows(json: string | undefined): any[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Validate a raw row and convert to ParsedTrainer
 */
export function validateAndParseRow(row: RawTrainerRow, source: TrainerSource): {
  trainer: ParsedTrainer | null
  error: string | null
} {
  // Required fields
  if (!row.email || !row.email.trim()) {
    return { trainer: null, error: 'Email is required' }
  }
  if (!row.fullName || !row.fullName.trim()) {
    return { trainer: null, error: 'Full name is required' }
  }

  // Normalize email
  const email = row.email.trim().toLowerCase()

  // Validate email format (basic)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { trainer: null, error: `Invalid email format: ${email}` }
  }

  // Normalize status
  const status = row.status?.trim().toLowerCase() || 'actif'
  if (!['actif', 'inactif'].includes(status)) {
    return { trainer: null, error: `Invalid status: ${status}` }
  }

  // Parse city (validate if provided)
  const city = row.city?.trim() || null
  if (city && !['Brazzaville', 'Pointe-Noire', 'Brazzaville/Pointe-Noire'].includes(city)) {
    return { trainer: null, error: `Invalid city: ${city}` }
  }

  const trainer: ParsedTrainer = {
    externalRef: row.externalRef?.trim() || null,
    email,
    fullName: row.fullName.trim(),
    phone: row.phone?.trim() || null,
    city,
    skills: parseSkills(row.skills),
    availabilityWindows: parseAvailabilityWindows(row.availabilityJson),
    status,
    site: row.site?.trim() || null,
    source,
  }

  return { trainer, error: null }
}

/**
 * DRY RUN: Parse rows and detect differences without writing
 */
export async function dryRunSync(
  rows: RawTrainerRow[],
  source: TrainerSource,
): Promise<SyncResult> {
  const result: SyncResult = {
    created: [],
    updated: [],
    unchanged: [],
    rejected: [],
    conflicts: [],
  }

  for (const row of rows) {
    const { trainer, error } = validateAndParseRow(row, source)

    if (!trainer || error) {
      result.rejected.push({ row, reason: error || 'Invalid row' })
      continue
    }

    // Check if trainer exists
    const existing = await db
      .select()
      .from(trainers)
      .where(eq(trainers.email, trainer.email))
      .limit(1)

    if (existing.length === 0) {
      // New trainer
      result.created.push(trainer)
    } else {
      const existingTrainer = existing[0]

      // Protection: never sync manual trainers
      if (existingTrainer.source === 'manuel') {
        result.conflicts.push({
          trainerId: existingTrainer.id,
          email: trainer.email,
          fieldConflicts: [
            {
              field: 'source',
              imported: trainer.source,
              current: existingTrainer.source,
            },
          ],
        })
        continue
      }

      // Check for field differences
      const fieldDifferences: Array<{ field: string; previous: any; current: any }> = []

      const fieldsToCompare: (keyof ParsedTrainer)[] = [
        'fullName',
        'phone',
        'city',
        'skills',
        'status',
        'site',
      ]

      for (const field of fieldsToCompare) {
        const imported = trainer[field]
        const existing_value = existingTrainer[field]

        // Deep comparison for arrays
        if (Array.isArray(imported) && Array.isArray(existing_value)) {
          if (JSON.stringify(imported.sort()) !== JSON.stringify(existing_value.sort())) {
            fieldDifferences.push({ field, previous: existing_value, current: imported })
          }
        } else if (imported !== existing_value) {
          fieldDifferences.push({ field, previous: existing_value, current: imported })
        }
      }

      if (fieldDifferences.length === 0) {
        result.unchanged.push(trainer)
      } else {
        result.updated.push({
          previous: {
            externalRef: existingTrainer.externalRef,
            email: existingTrainer.email,
            fullName: existingTrainer.fullName,
            phone: existingTrainer.phone,
            city: existingTrainer.city,
            skills: existingTrainer.skills || [],
            availabilityWindows: (Array.isArray(existingTrainer.availabilityWindows) ? existingTrainer.availabilityWindows : []) as any,
            status: existingTrainer.status,
            site: existingTrainer.site,
            source: existingTrainer.source,
          },
          current: trainer,
        })
      }
    }
  }

  return result
}

/**
 * COMMIT: Apply dry run results to database
 */
export async function commitSync(
  dryRunResult: SyncResult,
  actorId: string,
  source: 'google_sheets' | 'xlsx_upload',
): Promise<{ importRunId: string; finalResult: SyncResult }> {
  const now = new Date()

  // Create import run record
  const [importRun] = await db
    .insert(importRuns)
    .values({
      source,
      actorId: actorId as any,
      timestamp: now,
      status: 'committed',
      counts: {
        created: dryRunResult.created.length,
        updated: dryRunResult.updated.length,
        unchanged: dryRunResult.unchanged.length,
        rejected: dryRunResult.rejected.length,
      },
      errorReport: dryRunResult.rejected.map((r, i) => ({
        row_num: i + 2, // +2 for header and 1-based indexing
        issue: r.reason,
        email: r.row.email,
      })),
    })
    .returning()

  // Insert created trainers
  for (const trainer of dryRunResult.created) {
    await db.insert(trainers).values({
      externalRef: trainer.externalRef,
      email: trainer.email,
      fullName: trainer.fullName,
      phone: trainer.phone,
      city: trainer.city,
      skills: trainer.skills,
      availabilityWindows: trainer.availabilityWindows as any,
      status: trainer.status as any,
      site: trainer.site,
      source: trainer.source,
      importRunId: importRun.id,
      importedAt: now,
    })
  }

  // Update existing trainers (synced ones only)
  for (const { current } of dryRunResult.updated) {
    await db
      .update(trainers)
      .set({
        fullName: current.fullName,
        phone: current.phone,
        city: current.city,
        skills: current.skills,
        availabilityWindows: current.availabilityWindows as any,
        status: current.status as any,
        site: current.site,
        importRunId: importRun.id,
        importedAt: now,
        updatedAt: now,
      })
      .where(eq(trainers.email, current.email))
  }

  return {
    importRunId: importRun.id,
    finalResult: dryRunResult,
  }
}

/**
 * Parse Google Sheets rows (assumes columns: A=externalRef, B=email, C=fullName, D=phone, E=city, F=skills, G=availability, H=status, I=site)
 */
export function parseGoogleSheetsRows(rows: any[][]): RawTrainerRow[] {
  return rows
    .filter((row) => row && row.length > 0) // Skip empty rows
    .map((row) => ({
      externalRef: row[0],
      email: row[1],
      fullName: row[2],
      phone: row[3],
      city: row[4],
      skills: row[5], // CSV string
      availabilityJson: row[6],
      status: row[7],
      site: row[8],
    }))
}

/**
 * Parse XLSX rows (expects same column order as Google Sheets)
 */
export function parseXlsxRows(rows: any[][]): RawTrainerRow[] {
  return parseGoogleSheetsRows(rows) // Same format
}
