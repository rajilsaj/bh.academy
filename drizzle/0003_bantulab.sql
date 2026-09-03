-- BantuLab : formations, modules pondérés, comptes formateurs, ressources,
-- points, décisions par module, kit remis et centre de notifications.
--
-- Une formation (programme) porte des modules ordonnés. Chaque module vaut un
-- total de points ; la somme des poids des modules fait les points de
-- complétion de la formation. L'avancement d'un apprenant se calcule, comme
-- le niveau : rien n'est figé à part les décisions humaines (à refaire, exclu).

-- Les formateurs sont des membres du personnel avec le rôle `formateur`.
ALTER TABLE "staff" DROP CONSTRAINT IF EXISTS "staff_role_check";--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"starts_on" date,
	"ends_on" date,
	"schedule" text,
	"expected_learners" integer,
	"expectations" text,
	"partner" text,
	"goal_checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN IF NOT EXISTS "program_id" uuid;--> statement-breakpoint
ALTER TABLE "cohorts" DROP CONSTRAINT IF EXISTS "cohorts_program_id_programs_id_fk";--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "program_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration_hours" numeric(5, 1),
	"points_total" integer DEFAULT 100 NOT NULL,
	"points_presence" integer DEFAULT 10 NOT NULL,
	"points_ressource" integer DEFAULT 5 NOT NULL,
	"points_quiz" integer DEFAULT 30 NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"pass_threshold_pct" integer DEFAULT 70 NOT NULL,
	"trainer_id" uuid,
	CONSTRAINT "program_modules_program_title_uq" UNIQUE("program_id","title")
);
--> statement-breakpoint
ALTER TABLE "program_modules" ADD CONSTRAINT "program_modules_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_modules" ADD CONSTRAINT "program_modules_trainer_id_staff_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_modules_program_idx" ON "program_modules" ("program_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "trainer_profiles" (
	"staff_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"bio" text,
	"phone" text,
	"linkedin" text,
	"website" text,
	"linktree" text,
	"socials" text,
	"invitation_token" text,
	"invited_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "trainer_profiles_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
ALTER TABLE "trainer_profiles" ADD CONSTRAINT "trainer_profiles_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"trainer_id" uuid,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"path" text,
	"points" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_module_id_program_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."program_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_trainer_id_staff_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_module_idx" ON "resources" ("module_id");--> statement-breakpoint

-- Journal de points : on ajoute, on ne modifie pas. Une même origine
-- (session, ressource, quiz) ne crédite jamais deux fois le même apprenant.
CREATE TABLE IF NOT EXISTS "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" text NOT NULL,
	"module_id" uuid,
	"source" text NOT NULL,
	"ref_id" text,
	"points" integer NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_module_id_program_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."program_modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_created_by_staff_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "points_ledger_origine_uq" ON "points_ledger" ("learner_id","source","ref_id") WHERE "ref_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "points_ledger_learner_idx" ON "points_ledger" ("learner_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "module_decisions" (
	"learner_id" text NOT NULL,
	"module_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"note" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "module_decisions_pk" PRIMARY KEY("learner_id","module_id")
);
--> statement-breakpoint
ALTER TABLE "module_decisions" ADD CONSTRAINT "module_decisions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_decisions" ADD CONSTRAINT "module_decisions_module_id_program_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."program_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_decisions" ADD CONSTRAINT "module_decisions_decided_by_staff_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Le kit remis à l'apprenant : licence, ordinateur, modem, clé USB, bloc-notes.
CREATE TABLE IF NOT EXISTS "learner_kit" (
	"learner_id" text NOT NULL,
	"item" text NOT NULL,
	"given_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_kit_pk" PRIMARY KEY("learner_id","item")
);
--> statement-breakpoint
ALTER TABLE "learner_kit" ADD CONSTRAINT "learner_kit_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" text NOT NULL,
	"recipient" text NOT NULL,
	"recipient_name" text,
	"subject" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'en_attente' NOT NULL,
	"error" text,
	"learner_id" text,
	"staff_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_staff_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "notifications" ("status","created_at");--> statement-breakpoint

-- Points par module et par apprenant. Le statut vient d'abord d'une décision
-- humaine ; sinon du seuil (70 % par défaut).
CREATE OR REPLACE VIEW v_module_points AS
SELECT
	l.id AS learner_id,
	l.cohort_id,
	pm.id AS module_id,
	pm.program_id,
	pm.position,
	pm.title,
	pm.points_total,
	pm.weight,
	pm.pass_threshold_pct,
	COALESCE(sum(pl.points), 0)::int AS points_acquis,
	CASE WHEN pm.points_total > 0
		THEN round(least(greatest(COALESCE(sum(pl.points), 0), 0)::numeric / pm.points_total, 1), 4)
		ELSE 0 END AS pct,
	md.decision,
	CASE
		WHEN md.decision IS NOT NULL THEN md.decision
		WHEN pm.points_total > 0
			AND COALESCE(sum(pl.points), 0)::numeric / pm.points_total >= pm.pass_threshold_pct / 100.0
			THEN 'valide'
		WHEN COALESCE(sum(pl.points), 0) = 0 THEN 'non_commence'
		ELSE 'en_cours'
	END AS statut
FROM learners l
JOIN cohorts c ON c.id = l.cohort_id
JOIN program_modules pm ON pm.program_id = c.program_id
LEFT JOIN points_ledger pl ON pl.learner_id = l.id AND pl.module_id = pm.id
LEFT JOIN module_decisions md ON md.learner_id = l.id AND md.module_id = pm.id
GROUP BY l.id, l.cohort_id, pm.id, md.decision;
--> statement-breakpoint

-- Complétion de la formation : moyenne des modules pondérée par leur poids.
CREATE OR REPLACE VIEW v_program_completion AS
SELECT
	learner_id,
	cohort_id,
	program_id,
	round(sum(pct * weight) / NULLIF(sum(weight), 0), 4) AS completion,
	sum(points_acquis)::int AS points_acquis,
	sum(points_total)::int AS points_total,
	count(*) FILTER (WHERE statut = 'valide')::int AS modules_valides,
	count(*) FILTER (WHERE statut = 'a_refaire')::int AS modules_a_refaire,
	count(*)::int AS modules_total,
	bool_or(statut = 'exclu') AS exclu
FROM v_module_points
GROUP BY learner_id, cohort_id, program_id;
