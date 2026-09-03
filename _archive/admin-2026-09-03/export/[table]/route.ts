import { sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import { can, requirePermission } from '@/lib/auth'
import { csvResponse, toCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

/**
 * Chaque table est exportable telle quelle : c'est la porte de sortie du système.
 * Les requêtes sont figées ici — aucun nom de table ne vient de l'URL.
 */
// Les colonnes `timestamptz` sont converties en texte par PostgreSQL lui-même :
// passer par un Date JavaScript tronquerait les microsecondes et l'export ne se
// réimporterait plus à l'identique.
const TABLES: Record<string, { sql: string; sensitive?: boolean }> = {
  cohorts: { sql: 'select id, name, starts_on, ends_on from cohorts order by starts_on' },
  learners: {
    sql: `select id, cohort_id, full_name, phone, email, token, consent_community, consent_data,
                 created_at::text as created_at
          from learners order by id`,
    sensitive: true,
  },
  staff: { sql: 'select id, email, role from staff order by email' },
  sessions: {
    sql: `select id, cohort_id, module_name, held_on, day_code,
                 opens_at::text as opens_at, closes_at::text as closes_at
          from sessions order by held_on`,
  },
  attendance: {
    sql: `select learner_id, session_id, checked_in_at::text as checked_in_at
          from attendance order by learner_id, checked_in_at`,
  },
  quizzes: { sql: 'select id, module_name, title, is_baseline from quizzes order by title' },
  quiz_questions: {
    sql: `select id, quiz_id, position, prompt, options, correct_index
          from quiz_questions order by quiz_id, position`,
  },
  quiz_attempts: {
    sql: `select id, learner_id, quiz_id, score, max_score, answers,
                 submitted_at::text as submitted_at
          from quiz_attempts order by learner_id, submitted_at`,
  },
  waves: {
    sql: `select id, code, label_fr, opens_at::text as opens_at, closes_at::text as closes_at
          from waves order by code`,
  },
  responses: {
    sql: `select id, learner_id, wave_id, payload, submitted_at::text as submitted_at
          from responses order by learner_id, submitted_at`,
  },
  documents: {
    sql: `select id, learner_id, doc_type, version, path, uploaded_at::text as uploaded_at
          from documents order by learner_id, doc_type, version`,
  },
  outcomes: {
    sql: `select id, learner_id, outcome_type, occurred_on, detail
          from outcomes order by learner_id, occurred_on`,
  },
  certificates: {
    sql: `select id, learner_id, code, title, progress_pct, issued_on, issued_by
          from certificates order by issued_on, code`,
  },
  parcours: {
    sql: `select learner_id, cohort_id, full_name, modules_ouverts, modules_termines,
                 modules_total, avancement, score_quiz_moyen, documents,
                 certificat_code, certificat_le
          from v_learner_progress order by learner_id`,
  },
  modules: {
    sql: `select learner_id, cohort_id, module_name, position, seances_tenues,
                 seances_suivies, quiz_prevus, quiz_faits, quiz_score, avancement, statut
          from v_module_progress order by learner_id, position`,
  },
  indicateurs: {
    sql: 'select metric, dimension, cohort_id, cohort_name, value, unit from v_indicators order by metric, dimension',
  },
  /* BantuLab */
  programs: {
    sql: `select id, name, description, starts_on, ends_on, schedule, expected_learners,
                 expectations, partner, goal_checklist, created_at::text as created_at
          from programs order by starts_on, name`,
  },
  program_modules: {
    sql: `select m.id, m.program_id, p.name as program_name, m.position, m.title, m.description,
                 m.duration_hours, m.points_total, m.points_presence, m.points_ressource,
                 m.points_quiz, m.weight, m.pass_threshold_pct, m.trainer_id, t.full_name as trainer_name
          from program_modules m
          join programs p on p.id = m.program_id
          left join trainer_profiles t on t.staff_id = m.trainer_id
          order by p.name, m.position`,
  },
  formateurs: {
    sql: `select s.id, s.email, s.role, t.full_name, t.phone, t.linkedin, t.website, t.linktree,
                 t.socials, t.invited_at::text as invited_at, t.confirmed_at::text as confirmed_at
          from staff s
          left join trainer_profiles t on t.staff_id = s.id
          order by s.role, s.email`,
    sensitive: true,
  },
  resources: {
    sql: `select r.id, r.module_id, m.title as module_title, r.kind, r.title, r.url, r.path, r.points,
                 r.trainer_id, r.created_at::text as created_at
          from resources r join program_modules m on m.id = r.module_id
          order by m.position, r.created_at`,
  },
  points: {
    sql: `select id, learner_id, module_id, source, ref_id, points, note, created_by,
                 created_at::text as created_at
          from points_ledger order by learner_id, created_at`,
  },
  points_modules: {
    sql: `select learner_id, cohort_id, module_id, program_id, position, title, points_total, weight,
                 pass_threshold_pct, points_acquis, pct, decision, statut
          from v_module_points order by learner_id, position`,
  },
  completion: {
    sql: `select learner_id, cohort_id, program_id, completion, points_acquis, points_total,
                 modules_valides, modules_a_refaire, modules_total, exclu
          from v_program_completion order by learner_id`,
  },
  decisions: {
    sql: `select learner_id, module_id, decision, note, decided_by, decided_at::text as decided_at
          from module_decisions order by learner_id`,
  },
  kit: {
    sql: `select learner_id, item, given_at::text as given_at from learner_kit order by learner_id, item`,
  },
  notifications: {
    sql: `select id, channel, recipient, recipient_name, subject, status, error, learner_id, staff_id,
                 created_at::text as created_at, sent_at::text as sent_at
          from notifications order by created_at desc`,
    sensitive: true,
  },
  niveaux: {
    sql: `select learner_id, cohort_id, full_name, sessions_total, sessions_attended,
                 attendance_rate, max_consecutive_absences, responses_last_two,
                 responded_last_closed, has_any_response, quiz_attempts_count,
                 has_positive_outcome, level
          from v_learner_level order by learner_id`,
  },
}

/** Une ligne par apprenant, tout à plat : le CSV que le bailleur demandera. */
const TABLEAU_DE_BORD = `
  select
    l.id                                   as identifiant,
    l.full_name                            as nom_complet,
    l.phone                                as telephone,
    l.email                                as email,
    c.name                                 as promotion,
    l.created_at::text                     as inscrit_le,
    l.consent_community                    as consent_communaute,
    l.consent_data                         as consent_donnees,
    v.level                                as niveau,
    v.sessions_attended                    as seances_presentes,
    v.sessions_total                       as seances_totales,
    v.attendance_rate                      as taux_presence,
    v.max_consecutive_absences             as absences_consecutives,
    p.baseline_pct                         as quiz_initial_pct,
    p.endline_pct                          as quiz_final_pct,
    p.delta_pct                            as progression_quiz,
    (select count(*) from responses r where r.learner_id = l.id)          as nb_reponses,
    (select string_agg(w.code, ' ' order by w.code)
       from responses r join waves w on w.id = r.wave_id
      where r.learner_id = l.id)                                          as vagues_repondues,
    (select count(*) from documents d where d.learner_id = l.id)          as nb_documents,
    (select count(distinct d.doc_type) from documents d where d.learner_id = l.id) as nb_types_documents,
    (select max(d.version) from documents d where d.learner_id = l.id and d.doc_type = 'cv') as version_cv,
    (select count(*) from outcomes o where o.learner_id = l.id)           as nb_resultats,
    (select string_agg(distinct o.outcome_type, ' ')
       from outcomes o where o.learner_id = l.id)                         as types_resultats,
    (select min(o.occurred_on) from outcomes o
      where o.learner_id = l.id
        and o.outcome_type in ('emploi','stage','mission','projet'))      as premiere_insertion_le,
    pr.avancement                          as avancement,
    pr.modules_termines                    as modules_termines,
    pr.modules_total                       as modules_total,
    pr.certificat_code                     as certificat_code,
    pr.certificat_le                       as certificat_le
  from learners l
  join cohorts c on c.id = l.cohort_id
  join v_learner_level v on v.learner_id = l.id
  left join v_quiz_pairs p on p.learner_id = l.id
  left join v_learner_progress pr on pr.learner_id = l.id
  order by l.id
`

export async function GET(
  _request: Request,
  { params }: { params: { table: string } },
) {
  const session = await requirePermission('gererExport')
  if (!session) return new Response('Accès refusé', { status: 403 })

  const name = params.table
  const voitCoordonnees = can(session.user.role, 'voirCoordonnees')

  if (name === 'tableau-de-bord') {
    const rows = await db.execute<Record<string, unknown>>(raw.raw(TABLEAU_DE_BORD))
    const cleaned = voitCoordonnees
      ? rows
      : rows.map(({ telephone: _t, email: _e, ...rest }) => rest)
    return csvResponse('tableau-de-bord.csv', toCsv(cleaned as Record<string, unknown>[]))
  }

  const table = TABLES[name]
  if (!table) return new Response('Table inconnue', { status: 404 })

  const rows = await db.execute<Record<string, unknown>>(raw.raw(table.sql))
  const cleaned =
    table.sensitive && !voitCoordonnees
      ? rows.map(({ phone: _p, email: _e, token: _tok, recipient: _r, ...rest }) => rest)
      : rows

  return csvResponse(`${name}.csv`, toCsv(cleaned as Record<string, unknown>[]))
}
