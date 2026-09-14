import { db } from '../db'
import { affectations, sessions, trainers, modules } from '../db/schema'
import { eq, and, gte, lte, ne } from 'drizzle-orm'

/**
 * Trainer eligibility and conflict detection for session assignments.
 * All rules are synchronous and side-effect-free (no DB writes).
 * Conflicts are structured and detailed for the UI to render.
 */

export interface AvailabilityWindow {
  dayOfWeek: number // 0-6 (Sun-Sat)
  startTime: string // HH:MM
  endTime: string // HH:MM
}

export interface ConflictReason {
  type:
    | 'double_booked'
    | 'outside_availability'
    | 'missing_skills'
    | 'source_protected'
    | 'skill_mismatch'
  detail: string
  conflictingSessionId?: string
  conflictingTitle?: string
  missingSkills?: string[]
}

export interface EligibilityResult {
  trainerId: string
  name: string
  email: string
  eligibility: 'eligible' | 'possible' | 'unavailable'
  reasons: ConflictReason[]
  skills?: string[]
}

/**
 * Parse time string HH:MM to minutes since midnight
 */
export function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Check if two time ranges overlap (inclusive)
 */
export function timesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): boolean {
  return start1 < end2 && start2 < end1
}

/**
 * Get day of week from a date (0=Sunday, 6=Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay()
}

/**
 * Get time in minutes from a date
 */
export function getTimeMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * Check if a trainer is available at a specific date/time based on availability_windows
 */
export function isAvailable(
  availabilityWindows: AvailabilityWindow[],
  date: Date,
): boolean {
  if (!availabilityWindows || availabilityWindows.length === 0) {
    // No windows defined = always available
    return true
  }

  const dayOfWeek = getDayOfWeek(date)
  const timeMinutes = getTimeMinutes(date)

  for (const window of availabilityWindows) {
    if (window.dayOfWeek === dayOfWeek) {
      const startMin = parseTime(window.startTime)
      const endMin = parseTime(window.endTime)
      if (timeMinutes >= startMin && timeMinutes < endMin) {
        return true
      }
    }
  }

  return false
}

/**
 * Check if trainer is available for an entire session (from opensAt to closesAt)
 */
export function isAvailableForSession(
  availabilityWindows: AvailabilityWindow[],
  opensAt: Date,
  closesAt: Date,
): boolean {
  if (!availabilityWindows || availabilityWindows.length === 0) {
    return true
  }

  // For simplicity, check both start and end times fall within a window on the same day
  // (sessions typically don't span days)
  const dayOfWeek = getDayOfWeek(opensAt)
  const startMin = getTimeMinutes(opensAt)
  const endMin = getTimeMinutes(closesAt)

  for (const window of availabilityWindows) {
    if (window.dayOfWeek === dayOfWeek) {
      const windowStart = parseTime(window.startTime)
      const windowEnd = parseTime(window.endTime)
      // Check if session fits entirely within this window
      if (startMin >= windowStart && endMin <= windowEnd) {
        return true
      }
    }
  }

  return false
}

/**
 * Check if trainer has all required skills
 */
export function hasRequiredSkills(
  trainerSkills: string[],
  requiredSkills: string[],
): { hasMissing: boolean; missing: string[] } {
  const trainerSkillsSet = new Set((trainerSkills || []).map((s) => s.toLowerCase()))
  const missing = (requiredSkills || []).filter(
    (skill) => !trainerSkillsSet.has(skill.toLowerCase()),
  )
  return { hasMissing: missing.length > 0, missing }
}

/**
 * Core business rule: Check all conflicts for assigning a trainer to a session
 * Returns structured conflicts or empty array if no conflicts
 */
export function validateTrainerSessionAssignment(params: {
  trainer: {
    id: string
    source: string
    skills: string[] | null
    availabilityWindows: AvailabilityWindow[] | null
  }
  session: {
    id: string
    opensAt: Date
    closesAt: Date
  }
  requiredSkills: string[]
  overlappingSessions: { id: string; title: string; opensAt: Date; closesAt: Date }[]
}): ConflictReason[] {
  const conflicts: ConflictReason[] = []
  const { trainer, session, requiredSkills, overlappingSessions } = params

  // Rule 1: Manual trainers cannot be sync-modified (this is meta-level, for sync only)
  if (trainer.source === 'manuel') {
    // Note: This is checked at API level, not here
  }

  // Rule 2: Check for overlapping assignments
  for (const other of overlappingSessions) {
    if (
      timesOverlap(
        other.opensAt.getTime(),
        other.closesAt.getTime(),
        session.opensAt.getTime(),
        session.closesAt.getTime(),
      )
    ) {
      conflicts.push({
        type: 'double_booked',
        detail: `Already assigned to "${other.title}"`,
        conflictingSessionId: other.id,
        conflictingTitle: other.title,
      })
    }
  }

  // Rule 3: Check availability windows
  if (!isAvailableForSession(trainer.availabilityWindows || [], session.opensAt, session.closesAt)) {
    conflicts.push({
      type: 'outside_availability',
      detail: `Not available at this date/time`,
    })
  }

  // Rule 4: Check required skills (warn, not block)
  const { hasMissing, missing } = hasRequiredSkills(trainer.skills || [], requiredSkills)
  if (hasMissing) {
    conflicts.push({
      type: 'missing_skills',
      detail: `Missing ${missing.length} required skill${missing.length > 1 ? 's' : ''}`,
      missingSkills: missing,
    })
  }

  return conflicts
}

/**
 * Protection: Check if a synced trainer record differs from its imported source
 * Used to detect local edits and flag conflicts
 */
export interface FieldConflict {
  field: string
  importedValue: any
  currentValue: any
}

export function detectFieldConflicts(
  imported: Record<string, any>,
  current: Record<string, any>,
  fieldsToCheck: string[],
): FieldConflict[] {
  const conflicts: FieldConflict[] = []

  for (const field of fieldsToCheck) {
    const importedVal = imported[field]
    const currentVal = current[field]

    // Deep equality for arrays and objects
    const isEqual =
      JSON.stringify(importedVal) === JSON.stringify(currentVal)

    if (!isEqual) {
      conflicts.push({
        field,
        importedValue: importedVal,
        currentValue: currentVal,
      })
    }
  }

  return conflicts
}

/**
 * Comprehensive eligibility determination with all reasons
 */
export function assessTrainerEligibility(params: {
  trainer: {
    id: string
    fullName: string
    email: string
    source: string
    status: string
    skills: string[] | null
    availabilityWindows: AvailabilityWindow[] | null
  }
  session: {
    id: string
    opensAt: Date
    closesAt: Date
  }
  requiredSkills: string[]
  overlappingSessions: { id: string; title: string; opensAt: Date; closesAt: Date }[]
}): EligibilityResult {
  const { trainer, session, requiredSkills, overlappingSessions } = params

  const conflicts = validateTrainerSessionAssignment({
    trainer: {
      id: trainer.id,
      source: trainer.source,
      skills: trainer.skills,
      availabilityWindows: trainer.availabilityWindows,
    },
    session,
    requiredSkills,
    overlappingSessions,
  })

  // Determine eligibility tier based on conflict types
  let eligibility: 'eligible' | 'possible' | 'unavailable' = 'eligible'

  const blockingConflicts = conflicts.filter(
    (c) => c.type === 'double_booked' || c.type === 'outside_availability',
  )
  const warningConflicts = conflicts.filter((c) => c.type === 'missing_skills')

  if (blockingConflicts.length > 0) {
    eligibility = 'unavailable'
  } else if (warningConflicts.length > 0) {
    eligibility = 'possible'
  }

  return {
    trainerId: trainer.id,
    name: trainer.fullName,
    email: trainer.email,
    eligibility,
    reasons: conflicts,
    skills: trainer.skills || [],
  }
}
