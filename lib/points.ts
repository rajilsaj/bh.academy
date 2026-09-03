import { and, asc, eq, sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  cohorts,
  pointsLedger,
  programModules,
  type PointSource,
} from '@/lib/db/schema'

/**
 * Les points : ce qu'un apprenant gagne en venant, en téléchargeant les
 * ressources et en faisant les quiz. Chaque module a son total ; à 70 % le
 * module est validé, sinon le formateur décide (à refaire, ou exclusion).
 *
 * Tout passe par `crediter` : une origine (session, ressource, quiz) ne crédite
 * jamais deux fois — l'index unique du journal s'en assure, pas le code.
 */

export type ModuleRow = typeof programModules.$inferSelect

/** Le module d'une formation qui porte ce titre, pour la promotion donnée. */
export async function moduleParTitre(cohortId: string, titre: string): Promise<ModuleRow | null> {
  const [cohorte] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1)
  if (cohorte?.programId) {
    const [m] = await db
      .select()
      .from(programModules)
      .where(and(eq(programModules.programId, cohorte.programId), eq(programModules.title, titre)))
      .limit(1)
    if (m) return m
  }
  // Promotion sans formation rattachée : on prend le premier module homonyme.
  const [m] = await db
    .select()
    .from(programModules)
    .where(eq(programModules.title, titre))
    .orderBy(asc(programModules.position))
    .limit(1)
  return m ?? null
}

export async function crediter(entree: {
  learnerId: string
  moduleId: string | null
  source: PointSource
  refId?: string | null
  points: number
  note?: string | null
  createdBy?: string | null
}) {
  if (!Number.isFinite(entree.points) || entree.points === 0) return
  await db
    .insert(pointsLedger)
    .values({
      learnerId: entree.learnerId,
      moduleId: entree.moduleId,
      source: entree.source,
      refId: entree.refId ?? null,
      points: Math.round(entree.points),
      note: entree.note ?? null,
      createdBy: entree.createdBy ?? null,
    })
    .onConflictDoNothing()
}

/** Présence à une session : les points de présence du module. */
export async function crediterPresence(learner: { id: string; cohortId: string }, seance: { id: string; moduleName: string }) {
  const m = await moduleParTitre(learner.cohortId, seance.moduleName)
  if (!m) return
  await crediter({ learnerId: learner.id, moduleId: m.id, source: 'presence', refId: seance.id, points: m.pointsPresence })
}

/** Quiz : les points de quiz du module, au prorata du score. */
export async function crediterQuiz(
  learner: { id: string; cohortId: string },
  quiz: { id: string; moduleName: string },
  score: number,
  maxScore: number,
) {
  const m = await moduleParTitre(learner.cohortId, quiz.moduleName)
  if (!m || maxScore <= 0) return
  await crediter({
    learnerId: learner.id,
    moduleId: m.id,
    source: 'quiz',
    refId: quiz.id,
    points: Math.round((m.pointsQuiz * score) / maxScore),
  })
}

export type ModulePoints = {
  learner_id: string
  cohort_id: string
  module_id: string
  program_id: string
  position: number
  title: string
  points_total: number
  weight: number
  pass_threshold_pct: number
  points_acquis: number
  pct: string
  decision: string | null
  statut: 'valide' | 'a_refaire' | 'exclu' | 'non_commence' | 'en_cours'
}

export type Completion = {
  learner_id: string
  cohort_id: string
  program_id: string
  completion: string | null
  points_acquis: number
  points_total: number
  modules_valides: number
  modules_a_refaire: number
  modules_total: number
  exclu: boolean
}

export async function pointsParModule(cohortId?: string, learnerId?: string) {
  return db.execute<ModulePoints>(raw`
    select * from v_module_points
    where true
      ${cohortId ? raw`and cohort_id = ${cohortId}` : raw``}
      ${learnerId ? raw`and learner_id = ${learnerId}` : raw``}
    order by learner_id, position
  `)
}

export async function completions(cohortId?: string) {
  return db.execute<Completion & { full_name: string }>(raw`
    select c.*, l.full_name
    from v_program_completion c
    join learners l on l.id = c.learner_id
    ${cohortId ? raw`where c.cohort_id = ${cohortId}` : raw``}
    order by c.completion desc nulls last, l.id
  `)
}

export async function completionApprenant(learnerId: string): Promise<Completion | null> {
  const rows = await db.execute<Completion>(
    raw`select * from v_program_completion where learner_id = ${learnerId}`,
  )
  return rows[0] ?? null
}
