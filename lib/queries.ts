import { and, asc, desc, eq, sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  attendance,
  certificates,
  cohorts,
  documents,
  learners,
  outcomes,
  quizAttempts,
  quizQuestions,
  quizzes,
  responses,
  sessions,
  waves,
  type Level,
} from '@/lib/db/schema'
import { isWellFormedToken } from '@/lib/ids'

export type LearnerRow = typeof learners.$inferSelect

export async function getLearnerByToken(token: string): Promise<LearnerRow | null> {
  if (!isWellFormedToken(token)) return null
  const [row] = await db.select().from(learners).where(eq(learners.token, token)).limit(1)
  return row ?? null
}

/** Session de la promotion dont la fenêtre de pointage est ouverte maintenant. */
export async function getOpenSession(cohortId: string) {
  const [row] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.cohortId, cohortId),
        raw`${sessions.opensAt} <= now()`,
        raw`${sessions.closesAt} > now()`,
      ),
    )
    .orderBy(asc(sessions.opensAt))
    .limit(1)
  return row ?? null
}

export async function getOpenWave() {
  const [row] = await db
    .select()
    .from(waves)
    .where(
      and(
        raw`${waves.opensAt} is not null`,
        raw`${waves.opensAt} <= now()`,
        raw`(${waves.closesAt} is null or ${waves.closesAt} > now())`,
      ),
    )
    .orderBy(asc(waves.opensAt))
    .limit(1)
  return row ?? null
}

export async function getWaveByCode(code: string) {
  const [row] = await db.select().from(waves).where(eq(waves.code, code as never)).limit(1)
  return row ?? null
}

/**
 * Un quiz devient accessible dès qu'une session du même module a eu lieu dans la
 * promotion de l'apprenant. Aucun état supplémentaire à maintenir à la main.
 */
export async function getPendingQuiz(learner: LearnerRow) {
  const rows = await db.execute<{ id: string; title: string; module_name: string }>(raw`
    select q.id, q.title, q.module_name
    from quizzes q
    join sessions s
      on s.module_name = q.module_name
     and s.cohort_id = ${learner.cohortId}
     and s.held_on <= current_date
    where not exists (
      select 1 from quiz_attempts qa
      where qa.quiz_id = q.id and qa.learner_id = ${learner.id}
    )
    group by q.id, q.title, q.module_name, q.is_baseline
    order by q.is_baseline desc, min(s.held_on) asc
    limit 1
  `)
  return rows[0] ?? null
}

export type PendingAction =
  | { kind: 'presence'; session: typeof sessions.$inferSelect }
  | { kind: 'quiz'; quizId: string; title: string }
  | { kind: 'suivi'; waveCode: string; label: string }
  | { kind: 'documents' }
  | { kind: 'rien' }

/**
 * Une seule action à la fois : ce que l'apprenant doit faire maintenant.
 * L'ordre de priorité est volontairement figé — jamais de menu.
 */
export async function getPendingAction(learner: LearnerRow): Promise<PendingAction> {
  const openSession = await getOpenSession(learner.cohortId)
  if (openSession) {
    const [already] = await db
      .select({ learnerId: attendance.learnerId })
      .from(attendance)
      .where(
        and(eq(attendance.learnerId, learner.id), eq(attendance.sessionId, openSession.id)),
      )
      .limit(1)
    if (!already) return { kind: 'presence', session: openSession }
  }

  const quiz = await getPendingQuiz(learner)
  if (quiz) return { kind: 'quiz', quizId: quiz.id, title: quiz.title }

  const openWave = await getOpenWave()
  if (openWave) {
    const [already] = await db
      .select({ id: responses.id })
      .from(responses)
      .where(and(eq(responses.learnerId, learner.id), eq(responses.waveId, openWave.id)))
      .limit(1)
    if (!already) return { kind: 'suivi', waveCode: openWave.code, label: openWave.labelFr }
  }

  const [cohort] = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, learner.cohortId))
    .limit(1)
  const finishedLongAgo =
    cohort && Date.now() > new Date(`${cohort.endsOn}T00:00:00`).getTime() + 180 * 86_400_000
  if (finishedLongAgo) return { kind: 'rien' }

  return { kind: 'documents' }
}

export async function getLearnerLevel(learnerId: string): Promise<Level | null> {
  const rows = await db.execute<{ level: Level }>(
    raw`select level from v_learner_level where learner_id = ${learnerId}`,
  )
  return rows[0]?.level ?? null
}

export async function getLevelCounts(cohortId?: string) {
  const rows = await db.execute<{ level: Level; n: string }>(
    cohortId
      ? raw`select level, count(*)::int as n from v_learner_level where cohort_id = ${cohortId} group by level`
      : raw`select level, count(*)::int as n from v_learner_level group by level`,
  )
  const counts: Record<Level, number> = { Vert: 0, Orange: 0, Rouge: 0, Bleu: 0 }
  for (const r of rows) counts[r.level] = Number(r.n)
  return counts
}

export type RelanceRow = {
  learner_id: string
  full_name: string
  phone: string | null
  token: string
  level: Level
  sans_reponse: boolean
  absent_derniere_seance: boolean
  last_contact_at: string | null
}

/**
 * L'écran de relance : qui n'a pas répondu à la vague ouverte, et qui a manqué
 * la dernière session tenue. « Dernier contact » = trace la plus récente laissée
 * par l'apprenant, quelle qu'elle soit.
 */
export async function getRelanceRows(cohortId?: string): Promise<RelanceRow[]> {
  const cohortFilter = cohortId ? raw`and l.cohort_id = ${cohortId}` : raw``
  const rows = await db.execute<RelanceRow>(raw`
    with open_wave as (
      select id, code from v_open_waves order by opens_at asc limit 1
    ),
    last_session as (
      select s.id, s.cohort_id
      from sessions s
      where s.held_on <= current_date
        and s.held_on = (
          select max(s2.held_on) from sessions s2 where s2.cohort_id = s.cohort_id and s2.held_on <= current_date
        )
    ),
    contact as (
      select learner_id, max(at) as last_contact_at from (
        select learner_id, checked_in_at as at from attendance
        union all
        select learner_id, submitted_at from quiz_attempts
        union all
        select learner_id, submitted_at from responses
        union all
        select learner_id, uploaded_at from documents
        union all
        select id, created_at from learners
      ) t group by learner_id
    )
    select
      l.id as learner_id,
      l.full_name,
      l.phone,
      l.token,
      v.level,
      (exists (select 1 from open_wave) and not exists (
        select 1 from responses r join open_wave ow on ow.id = r.wave_id where r.learner_id = l.id
      )) as sans_reponse,
      (exists (select 1 from last_session ls where ls.cohort_id = l.cohort_id) and not exists (
        select 1 from attendance a join last_session ls on ls.id = a.session_id
        where a.learner_id = l.id and ls.cohort_id = l.cohort_id
      )) as absent_derniere_seance,
      contact.last_contact_at
    from learners l
    join v_learner_level v on v.learner_id = l.id
    left join contact on contact.learner_id = l.id
    where true ${cohortFilter}
    order by
      case v.level when 'Rouge' then 0 when 'Orange' then 1 when 'Vert' then 2 else 3 end,
      contact.last_contact_at asc nulls first,
      l.id asc
  `)
  return rows.filter((r) => r.sans_reponse || r.absent_derniere_seance)
}

export async function getIndicators(cohortId?: string) {
  return db.execute<{
    metric: string
    dimension: string
    cohort_id: string
    cohort_name: string
    value: string | null
    unit: string
  }>(
    cohortId
      ? raw`select * from v_indicators where cohort_id = ${cohortId}`
      : raw`select * from v_indicators`,
  )
}

/** Toutes les données d'un apprenant, pour la fiche et la chronologie. */
export async function getLearnerDossier(learnerId: string) {
  const [learner] = await db.select().from(learners).where(eq(learners.id, learnerId)).limit(1)
  if (!learner) return null

  const [cohort] = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, learner.cohortId))
    .limit(1)

  const [presences, attempts, waveResponses, docs, results, levelRow] = await Promise.all([
    db
      .select({
        sessionId: sessions.id,
        moduleName: sessions.moduleName,
        heldOn: sessions.heldOn,
        checkedInAt: attendance.checkedInAt,
      })
      .from(sessions)
      .leftJoin(
        attendance,
        and(eq(attendance.sessionId, sessions.id), eq(attendance.learnerId, learnerId)),
      )
      .where(eq(sessions.cohortId, learner.cohortId))
      .orderBy(asc(sessions.heldOn)),
    db
      .select({
        id: quizAttempts.id,
        quizId: quizAttempts.quizId,
        title: quizzes.title,
        moduleName: quizzes.moduleName,
        isBaseline: quizzes.isBaseline,
        score: quizAttempts.score,
        maxScore: quizAttempts.maxScore,
        submittedAt: quizAttempts.submittedAt,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .where(eq(quizAttempts.learnerId, learnerId))
      .orderBy(asc(quizAttempts.submittedAt)),
    db
      .select({
        id: responses.id,
        waveCode: waves.code,
        waveLabel: waves.labelFr,
        payload: responses.payload,
        submittedAt: responses.submittedAt,
      })
      .from(responses)
      .innerJoin(waves, eq(waves.id, responses.waveId))
      .where(eq(responses.learnerId, learnerId))
      .orderBy(asc(responses.submittedAt)),
    db
      .select()
      .from(documents)
      .where(eq(documents.learnerId, learnerId))
      .orderBy(asc(documents.docType), asc(documents.version)),
    db
      .select()
      .from(outcomes)
      .where(eq(outcomes.learnerId, learnerId))
      .orderBy(desc(outcomes.occurredOn)),
    db.execute<{ level: Level; attendance_rate: string | null }>(
      raw`select level, attendance_rate from v_learner_level where learner_id = ${learnerId}`,
    ),
  ])

  return {
    learner,
    cohort,
    presences,
    attempts,
    responses: waveResponses,
    documents: docs,
    outcomes: results,
    level: levelRow[0]?.level ?? null,
    attendanceRate: levelRow[0]?.attendance_rate ?? null,
  }
}

export async function getQuizWithQuestions(quizId: string) {
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1)
  if (!quiz) return null
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.position))
  return { quiz, questions }
}

/* ------------------------------------------------------------------ */
/* Parcours : modules, avancement, certificats                         */
/* ------------------------------------------------------------------ */

export type ModuleProgress = {
  learner_id: string
  module_name: string
  position: number
  seances_tenues: number
  seances_suivies: number
  quiz_prevus: number
  quiz_faits: number
  quiz_score: string | null
  avancement: string | null
  statut: 'a_venir' | 'non_commence' | 'en_cours' | 'termine'
}

export type LearnerProgress = {
  learner_id: string
  cohort_id: string
  full_name: string
  modules_ouverts: number
  modules_termines: number
  modules_total: number
  avancement: string | null
  score_quiz_moyen: string | null
  documents: number
  certificat_code: string | null
  certificat_le: string | null
}

export async function getModuleProgress(learnerId: string) {
  return db.execute<ModuleProgress>(raw`
    select learner_id, module_name, position, seances_tenues, seances_suivies,
           quiz_prevus, quiz_faits, quiz_score, avancement, statut
    from v_module_progress
    where learner_id = ${learnerId}
    order by position
  `)
}

export async function getLearnerProgress(learnerId: string): Promise<LearnerProgress | null> {
  const rows = await db.execute<LearnerProgress>(
    raw`select * from v_learner_progress where learner_id = ${learnerId}`,
  )
  return rows[0] ?? null
}

/** Avancement de toute la promotion, pour le tableau du back-office. */
export async function getCohortProgress(cohortId?: string) {
  return db.execute<LearnerProgress & { level: Level; eligible: boolean }>(
    cohortId
      ? raw`select p.*, v.level, e.eligible
            from v_learner_progress p
            join v_learner_level v on v.learner_id = p.learner_id
            join v_certificate_eligibility e on e.learner_id = p.learner_id
            where p.cohort_id = ${cohortId}
            order by p.avancement desc nulls last, p.learner_id`
      : raw`select p.*, v.level, e.eligible
            from v_learner_progress p
            join v_learner_level v on v.learner_id = p.learner_id
            join v_certificate_eligibility e on e.learner_id = p.learner_id
            order by p.avancement desc nulls last, p.learner_id`,
  )
}

/** Une ligne par module : avancement moyen et nombre d'apprenants l'ayant fini. */
export async function getModulesOverview(cohortId?: string) {
  return db.execute<{
    module_name: string
    position: number
    seances_tenues: number
    seances_prevues: number
    avancement_moyen: string | null
    termine_par: number
    effectif: number
  }>(
    raw`
    select
      m.module_name,
      m.position,
      m.seances_tenues,
      m.seances_prevues,
      round(avg(mp.avancement), 4) as avancement_moyen,
      count(*) filter (where mp.statut = 'termine')::int as termine_par,
      count(mp.learner_id)::int as effectif
    from v_modules m
    join v_module_progress mp
      on mp.cohort_id = m.cohort_id and mp.module_name = m.module_name
    ${cohortId ? raw`where m.cohort_id = ${cohortId}` : raw``}
    group by m.module_name, m.position, m.seances_tenues, m.seances_prevues
    order by m.position
  `,
  )
}

/** Répartition de l'avancement en cinq tranches, pour l'histogramme. */
export async function getProgressDistribution(cohortId?: string) {
  const rows = await db.execute<{ tranche: number; n: number }>(
    raw`
    select least(greatest(width_bucket(avancement, 0, 1.0001, 5), 1), 5) as tranche,
           count(*)::int as n
    from v_learner_progress
    where avancement is not null
      ${cohortId ? raw`and cohort_id = ${cohortId}` : raw``}
    group by 1 order by 1
  `,
  )
  const tranches = [0, 0, 0, 0, 0]
  for (const r of rows) tranches[Number(r.tranche) - 1] = Number(r.n)
  return tranches
}

export async function getCertificate(learnerId: string) {
  const [row] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.learnerId, learnerId))
    .limit(1)
  return row ?? null
}

export async function getCertificateByCode(code: string) {
  const rows = await db.execute<{
    code: string
    title: string
    progress_pct: string
    issued_on: string
    full_name: string
    learner_id: string
    cohort_name: string
  }>(raw`
    select c.code, c.title, c.progress_pct, c.issued_on,
           l.full_name, l.id as learner_id, co.name as cohort_name
    from certificates c
    join learners l on l.id = c.learner_id
    join cohorts co on co.id = l.cohort_id
    where upper(c.code) = upper(${code})
    limit 1
  `)
  return rows[0] ?? null
}
