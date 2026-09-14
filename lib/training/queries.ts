/**
 * Database queries for training management
 * Fetches data needed for conflict detection and eligibility scoring
 */

import { db } from '../db'
import { affectations, trainers, sessions, modules } from '../db/schema'
import { eq, and, ne, or, lte, gte } from 'drizzle-orm'
import type { AvailabilityWindow } from './rules'

/**
 * Get a trainer with all their details
 */
export async function getTrainer(trainerId: string) {
  const [trainer] = await db.select().from(trainers).where(eq(trainers.id, trainerId)).limit(1)
  return trainer ? formatTrainerData(trainer) : null
}

/**
 * Get a session with its module details
 */
export async function getSession(sessionId: string) {
  const [session] = await db
    .select({
      session: sessions,
      module: modules,
    })
    .from(sessions)
    .leftJoin(modules, eq(sessions.moduleId, modules.id))
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!session) return null

  return {
    ...session.session,
    module: session.module,
    requiredSkills: session.module?.requiredSkills || [],
  }
}

/**
 * Get all sessions where a trainer is already assigned (for overlap detection)
 */
export async function getTrainerSessions(
  trainerId: string,
  excludeSessionId?: string,
): Promise<{ id: string; title: string; opensAt: Date; closesAt: Date }[]> {
  const query = db
    .select({
      id: sessions.id,
      title: modules.title,
      opensAt: sessions.opensAt,
      closesAt: sessions.closesAt,
    })
    .from(affectations)
    .leftJoin(sessions, eq(affectations.sessionId, sessions.id))
    .leftJoin(modules, eq(sessions.moduleId, modules.id))
    .where(
      and(
        eq(affectations.trainerId, trainerId),
        // Only confirmed or proposed assignments
        or(
          eq(affectations.status, 'confirmé'),
          eq(affectations.status, 'proposé'),
        ),
        // Exclude the current session
        excludeSessionId ? ne(sessions.id, excludeSessionId) : undefined,
      ),
    )

  const results = await query
  return results.map((r) => ({
    id: r.id || 'unknown',
    title: r.title || 'Unknown Session',
    opensAt: r.opensAt || new Date(),
    closesAt: r.closesAt || new Date(),
  }))
}

/**
 * Get all available trainers (active, with status filter)
 */
export async function getAllTrainers(filters?: {
  skill?: string
  city?: string
  status?: string
}) {
  const where = []

  if (filters?.status && ['actif', 'inactif'].includes(filters.status)) {
    where.push(eq(trainers.status, filters.status as 'actif' | 'inactif'))
  } else {
    where.push(eq(trainers.status, 'actif'))
  }

  const query = db.select().from(trainers)

  if (filters?.skill) {
    // Filter trainers that have the skill (PostgreSQL array contains)
    // Note: drizzle-orm doesn't have great array support, so this is handled in code
    const allTrainers = await query
    return allTrainers.filter((t) =>
      t.skills?.some((s) => s.toLowerCase().includes(filters.skill!.toLowerCase())),
    )
  }

  if (filters?.city) {
    // City filter
    const allTrainers = await query
    return allTrainers.filter((t) => {
      const trainerCity = t.city
      if (!trainerCity) return false
      // "Brazzaville/Pointe-Noire" matches both cities
      return trainerCity.includes(filters.city!)
    })
  }

  return await query
}

/**
 * Format trainer data for use in eligibility functions
 */
function formatTrainerData(trainer: any) {
  return {
    id: trainer.id,
    fullName: trainer.fullName,
    email: trainer.email,
    source: trainer.source,
    status: trainer.status,
    skills: Array.isArray(trainer.skills) ? trainer.skills : [],
    availabilityWindows: (
      trainer.availabilityWindows as unknown as AvailabilityWindow[] | null
    ) || [],
  }
}

/**
 * Check if a trainer can have an assignment removed (only if proposé)
 */
export async function canRemoveAffectation(affectationId: string): Promise<boolean> {
  const [affectation] = await db
    .select()
    .from(affectations)
    .where(eq(affectations.id, affectationId))
    .limit(1)

  return affectation?.status === 'proposé'
}

/**
 * Check if a session can be confirmed (has at least one confirmed titulaire)
 */
export async function canConfirmSession(sessionId: string): Promise<boolean> {
  const [titulaire] = await db
    .select()
    .from(affectations)
    .where(
      and(
        eq(affectations.sessionId, sessionId),
        eq(affectations.role, 'titulaire'),
        eq(affectations.status, 'confirmé'),
      ),
    )
    .limit(1)

  return titulaire !== undefined
}

/**
 * Get all affectations for a session
 */
export async function getSessionAffectations(sessionId: string) {
  return await db
    .select({
      affectation: affectations,
      trainer: trainers,
    })
    .from(affectations)
    .leftJoin(trainers, eq(affectations.trainerId, trainers.id))
    .where(eq(affectations.sessionId, sessionId))
}

/**
 * Get trainer's load (number of sessions) for a date range
 */
export async function getTrainerLoad(
  trainerId: string,
  fromDate: Date,
  toDate: Date,
): Promise<number> {
  const result = await db
    .select({ count: sessions.id })
    .from(affectations)
    .leftJoin(sessions, eq(affectations.sessionId, sessions.id))
    .where(
      and(
        eq(affectations.trainerId, trainerId),
        gte(sessions.opensAt, fromDate),
        lte(sessions.closesAt, toDate),
        or(
          eq(affectations.status, 'confirmé'),
          eq(affectations.status, 'proposé'),
        ),
      ),
    )

  return result.length
}
