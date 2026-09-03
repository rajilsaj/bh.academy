import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/** Deux rôles : l'administrateur voit et gère tout, le formateur ses modules et leurs ressources. */
export const ROLES = ['admin', 'formateur'] as const
export type Role = (typeof ROLES)[number]

export const DOC_TYPES = ['cv', 'lettre', 'rapport', 'excel', 'pptx', 'projet'] as const
export type DocType = (typeof DOC_TYPES)[number]

export const OUTCOME_TYPES = [
  'candidature',
  'entretien',
  'stage',
  'emploi',
  'mission',
  'projet',
] as const
export type OutcomeType = (typeof OUTCOME_TYPES)[number]

/** Les quatre types d'issue qui font passer un apprenant en Bleu. */
export const POSITIVE_OUTCOMES = ['emploi', 'stage', 'mission', 'projet'] as const

export const WAVE_CODES = ['J0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'] as const
export type WaveCode = (typeof WAVE_CODES)[number]

export const LEVELS = ['Vert', 'Orange', 'Rouge', 'Bleu'] as const
export type Level = (typeof LEVELS)[number]

export const cohorts = pgTable('cohorts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  startsOn: date('starts_on').notNull(),
  endsOn: date('ends_on').notNull(),
  /** La formation suivie par cette promotion ; ses modules portent les points. */
  programId: uuid('program_id').references(() => programs.id, { onDelete: 'set null' }),
})

export const learners = pgTable(
  'learners',
  {
    // Identifiant lisible par un humain : BH-IA-001
    id: text('id').primaryKey(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'restrict' }),
    fullName: text('full_name').notNull(),
    phone: text('phone'),
    email: text('email'),
    token: varchar('token', { length: 32 }).notNull().unique(),
    consentCommunity: boolean('consent_community').notNull().default(false),
    consentData: boolean('consent_data').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    cohortIdx: index('learners_cohort_idx').on(t.cohortId),
  }),
)

export const staff = pgTable('staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').$type<Role>().notNull(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    moduleName: text('module_name').notNull(),
    heldOn: date('held_on').notNull(),
    dayCode: varchar('day_code', { length: 6 }).notNull(),
    opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
    closesAt: timestamp('closes_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    cohortIdx: index('sessions_cohort_idx').on(t.cohortId),
    codeIdx: index('sessions_day_code_idx').on(t.dayCode),
  }),
)

export const attendance = pgTable(
  'attendance',
  {
    learnerId: text('learner_id')
      .notNull()
      .references(() => learners.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.learnerId, t.sessionId] }),
  }),
)

export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleName: text('module_name').notNull(),
  title: text('title').notNull(),
  isBaseline: boolean('is_baseline').notNull().default(false),
})

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    prompt: text('prompt').notNull(),
    options: jsonb('options').$type<string[]>().notNull(),
    correctIndex: integer('correct_index').notNull(),
  },
  (t) => ({
    uq: unique('quiz_questions_quiz_position_uq').on(t.quizId, t.position),
  }),
)

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnerId: text('learner_id')
      .notNull()
      .references(() => learners.id, { onDelete: 'cascade' }),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    maxScore: integer('max_score').notNull(),
    answers: jsonb('answers').$type<Record<string, number>>().notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uq: unique('quiz_attempts_learner_quiz_uq').on(t.learnerId, t.quizId),
  }),
)

export const waves = pgTable('waves', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').$type<WaveCode>().notNull().unique(),
  labelFr: text('label_fr').notNull(),
  opensAt: timestamp('opens_at', { withTimezone: true }),
  closesAt: timestamp('closes_at', { withTimezone: true }),
})

export const responses = pgTable(
  'responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnerId: text('learner_id')
      .notNull()
      .references(() => learners.id, { onDelete: 'cascade' }),
    waveId: uuid('wave_id')
      .notNull()
      .references(() => waves.id, { onDelete: 'cascade' }),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uq: unique('responses_learner_wave_uq').on(t.learnerId, t.waveId),
  }),
)

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnerId: text('learner_id')
      .notNull()
      .references(() => learners.id, { onDelete: 'cascade' }),
    docType: text('doc_type').$type<DocType>().notNull(),
    version: integer('version').notNull(),
    path: text('path').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Les versions ne sont jamais écrasées : (apprenant, type, version) est unique.
    uq: unique('documents_learner_type_version_uq').on(t.learnerId, t.docType, t.version),
  }),
)

export const outcomes = pgTable(
  'outcomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnerId: text('learner_id')
      .notNull()
      .references(() => learners.id, { onDelete: 'cascade' }),
    outcomeType: text('outcome_type').$type<OutcomeType>().notNull(),
    occurredOn: date('occurred_on').notNull(),
    detail: text('detail'),
  },
  (t) => ({
    learnerIdx: index('outcomes_learner_idx').on(t.learnerId),
  }),
)

/**
 * Le certificat est le seul état figé du système : une fois délivré, il porte
 * une date, un code vérifiable et le pourcentage atteint ce jour-là. Le
 * recalculer plus tard changerait un document déjà remis à quelqu'un.
 */
export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  learnerId: text('learner_id')
    .notNull()
    .references(() => learners.id, { onDelete: 'cascade' })
    .unique(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  progressPct: numeric('progress_pct', { precision: 5, scale: 4 }).notNull(),
  issuedOn: date('issued_on').notNull(),
  issuedBy: uuid('issued_by').references(() => staff.id, { onDelete: 'set null' }),
})

export const MODULE_STATUTS = ['a_venir', 'non_commence', 'en_cours', 'termine'] as const
export type ModuleStatut = (typeof MODULE_STATUTS)[number]

/* ------------------------------------------------------------------ */
/* BantuLab : formations, modules, formateurs, ressources, points,      */
/* décisions, kit remis, notifications.                                 */
/* ------------------------------------------------------------------ */

export const RESOURCE_KINDS = ['presentation', 'video', 'quiz', 'autre'] as const
export type ResourceKind = (typeof RESOURCE_KINDS)[number]

export const POINT_SOURCES = ['presence', 'ressource', 'quiz', 'manuel'] as const
export type PointSource = (typeof POINT_SOURCES)[number]

export const MODULE_DECISIONS = ['valide', 'a_refaire', 'exclu'] as const
export type ModuleDecision = (typeof MODULE_DECISIONS)[number]

export const NOTIFICATION_CHANNELS = ['mail', 'sms'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_STATUSES = ['en_attente', 'envoye', 'echec'] as const
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

export const KIT_ITEMS = ['licence', 'ordinateur', 'modem', 'cle_usb', 'bloc_notes'] as const
export type KitItem = (typeof KIT_ITEMS)[number]

/** Une formation : description, période, objectifs (liste générée ou saisie). */
export const programs = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  startsOn: date('starts_on'),
  endsOn: date('ends_on'),
  schedule: text('schedule'),
  expectedLearners: integer('expected_learners'),
  expectations: text('expectations'),
  partner: text('partner'),
  goalChecklist: jsonb('goal_checklist').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Un module : un total de points, ce que rapportent présence, ressource et
 * quiz, un poids dans la complétion, un seuil de validation, un formateur.
 * Son titre est la clé qui le relie aux sessions (`sessions.module_name`).
 */
export const programModules = pgTable(
  'program_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    durationHours: numeric('duration_hours', { precision: 5, scale: 1 }),
    pointsTotal: integer('points_total').notNull().default(100),
    pointsPresence: integer('points_presence').notNull().default(10),
    pointsRessource: integer('points_ressource').notNull().default(5),
    pointsQuiz: integer('points_quiz').notNull().default(30),
    weight: integer('weight').notNull().default(1),
    passThresholdPct: integer('pass_threshold_pct').notNull().default(70),
    trainerId: uuid('trainer_id').references(() => staff.id, { onDelete: 'set null' }),
  },
  (t) => ({
    uq: unique('program_modules_program_title_uq').on(t.programId, t.title),
    programIdx: index('program_modules_program_idx').on(t.programId),
  }),
)

/** Le profil public d'un formateur, et l'état de son invitation. */
export const trainerProfiles = pgTable('trainer_profiles', {
  staffId: uuid('staff_id')
    .primaryKey()
    .references(() => staff.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  bio: text('bio'),
  phone: text('phone'),
  linkedin: text('linkedin'),
  facebook: text('facebook'),
  website: text('website'),
  linktree: text('linktree'),
  socials: text('socials'),
  /** Portrait affiché sur la vitrine : chemin dans le stockage. */
  photoPath: text('photo_path'),
  invitationToken: text('invitation_token').unique(),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
})

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => programModules.id, { onDelete: 'cascade' }),
    trainerId: uuid('trainer_id').references(() => staff.id, { onDelete: 'set null' }),
    kind: text('kind').$type<ResourceKind>().notNull(),
    title: text('title').notNull(),
    url: text('url'),
    path: text('path'),
    points: integer('points').notNull().default(5),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    moduleIdx: index('resources_module_idx').on(t.moduleId),
  }),
)

/** Journal de points. L'unicité (apprenant, source, référence) est un index partiel en SQL. */
export const pointsLedger = pgTable(
  'points_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnerId: text('learner_id')
      .notNull()
      .references(() => learners.id, { onDelete: 'cascade' }),
    moduleId: uuid('module_id').references(() => programModules.id, { onDelete: 'set null' }),
    source: text('source').$type<PointSource>().notNull(),
    refId: text('ref_id'),
    points: integer('points').notNull(),
    note: text('note'),
    createdBy: uuid('created_by').references(() => staff.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    learnerIdx: index('points_ledger_learner_idx').on(t.learnerId),
  }),
)

export const moduleDecisions = pgTable(
  'module_decisions',
  {
    learnerId: text('learner_id')
      .notNull()
      .references(() => learners.id, { onDelete: 'cascade' }),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => programModules.id, { onDelete: 'cascade' }),
    decision: text('decision').$type<ModuleDecision>().notNull(),
    note: text('note'),
    decidedBy: uuid('decided_by').references(() => staff.id, { onDelete: 'set null' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.learnerId, t.moduleId] }),
  }),
)

export const learnerKit = pgTable(
  'learner_kit',
  {
    learnerId: text('learner_id')
      .notNull()
      .references(() => learners.id, { onDelete: 'cascade' }),
    item: text('item').$type<KitItem>().notNull(),
    givenAt: timestamp('given_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.learnerId, t.item] }),
  }),
)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channel: text('channel').$type<NotificationChannel>().notNull(),
    recipient: text('recipient').notNull(),
    recipientName: text('recipient_name'),
    subject: text('subject'),
    body: text('body').notNull(),
    status: text('status').$type<NotificationStatus>().notNull().default('en_attente'),
    error: text('error'),
    learnerId: text('learner_id').references(() => learners.id, { onDelete: 'set null' }),
    staffId: uuid('staff_id').references(() => staff.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => staff.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index('notifications_status_idx').on(t.status, t.createdAt),
  }),
)
