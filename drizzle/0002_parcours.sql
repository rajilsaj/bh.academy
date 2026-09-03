-- Modules, avancement et certificats.
--
-- Les modules ne sont pas une nouvelle table : ils existent déjà, portés par
-- `sessions.module_name`. Les redéclarer ailleurs créerait deux vérités.
-- L'avancement se calcule, comme le niveau. Le certificat, lui, est un objet
-- du monde réel : il se délivre une fois, porte une date et un code, et fige
-- le pourcentage atteint ce jour-là. C'est la seule chose que l'on stocke.

CREATE TABLE IF NOT EXISTS "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"progress_pct" numeric(5, 4) NOT NULL,
	"issued_on" date NOT NULL,
	"issued_by" uuid,
	CONSTRAINT "certificates_code_unique" UNIQUE("code"),
	CONSTRAINT "certificates_learner_unique" UNIQUE("learner_id")
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_staff_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Les modules de chaque promotion, dans l'ordre où ils sont enseignés.
CREATE OR REPLACE VIEW v_modules AS
WITH depuis_seances AS (
	SELECT
		s.cohort_id,
		s.module_name,
		min(s.held_on) AS premiere_seance,
		max(s.held_on) AS derniere_seance,
		count(*) AS seances_prevues,
		count(*) FILTER (WHERE s.held_on <= current_date) AS seances_tenues
	FROM sessions s
	GROUP BY s.cohort_id, s.module_name
)
SELECT
	d.cohort_id,
	d.module_name,
	d.premiere_seance,
	d.derniere_seance,
	d.seances_prevues,
	d.seances_tenues,
	row_number() OVER (PARTITION BY d.cohort_id ORDER BY d.premiere_seance, d.module_name) AS position,
	(d.seances_tenues > 0) AS demarre,
	(SELECT count(*) FROM quizzes q WHERE q.module_name = d.module_name) AS quiz_prevus
FROM depuis_seances d;
--> statement-breakpoint

-- Avancement d'un apprenant, module par module.
-- Présence et quiz pèsent 60 / 40 quand les deux existent ; sinon le seul
-- signal disponible fait foi. Un module non commencé vaut NULL, pas zéro :
-- on ne pénalise personne pour un cours qui n'a pas encore eu lieu.
CREATE OR REPLACE VIEW v_module_progress AS
WITH presence AS (
	SELECT
		l.id AS learner_id,
		m.cohort_id,
		m.module_name,
		count(s.id) AS seances_tenues,
		count(a.session_id) AS seances_suivies
	FROM learners l
	JOIN v_modules m ON m.cohort_id = l.cohort_id
	LEFT JOIN sessions s
		ON s.cohort_id = m.cohort_id
		AND s.module_name = m.module_name
		AND s.held_on <= current_date
	LEFT JOIN attendance a ON a.learner_id = l.id AND a.session_id = s.id
	GROUP BY l.id, m.cohort_id, m.module_name
), quiz AS (
	SELECT
		l.id AS learner_id,
		q.module_name,
		count(DISTINCT q.id) AS quiz_prevus,
		count(DISTINCT qa.quiz_id) AS quiz_faits,
		avg(qa.score::numeric / NULLIF(qa.max_score, 0)) AS score_moyen
	FROM learners l
	CROSS JOIN quizzes q
	LEFT JOIN quiz_attempts qa ON qa.learner_id = l.id AND qa.quiz_id = q.id
	GROUP BY l.id, q.module_name
)
SELECT
	p.learner_id,
	p.cohort_id,
	p.module_name,
	m.position,
	p.seances_tenues,
	p.seances_suivies,
	COALESCE(z.quiz_prevus, 0) AS quiz_prevus,
	COALESCE(z.quiz_faits, 0) AS quiz_faits,
	round(z.score_moyen, 4) AS quiz_score,
	CASE
		WHEN p.seances_tenues = 0 AND COALESCE(z.quiz_prevus, 0) = 0 THEN NULL
		WHEN COALESCE(z.quiz_prevus, 0) = 0 THEN
			round(p.seances_suivies::numeric / NULLIF(p.seances_tenues, 0), 4)
		WHEN p.seances_tenues = 0 THEN
			round(COALESCE(z.score_moyen, 0), 4)
		ELSE round(
			0.6 * (p.seances_suivies::numeric / NULLIF(p.seances_tenues, 0))
			+ 0.4 * COALESCE(z.score_moyen, 0),
		4)
	END AS avancement,
	CASE
		WHEN p.seances_tenues = 0 AND COALESCE(z.quiz_prevus, 0) = 0 THEN 'a_venir'
		WHEN p.seances_suivies = 0 AND COALESCE(z.quiz_faits, 0) = 0 THEN 'non_commence'
		WHEN p.seances_suivies >= p.seances_tenues
			AND COALESCE(z.quiz_faits, 0) >= COALESCE(z.quiz_prevus, 0) THEN 'termine'
		ELSE 'en_cours'
	END AS statut
FROM presence p
JOIN v_modules m ON m.cohort_id = p.cohort_id AND m.module_name = p.module_name
LEFT JOIN quiz z ON z.learner_id = p.learner_id AND z.module_name = p.module_name;
--> statement-breakpoint

-- Avancement global : moyenne des modules déjà commencés.
CREATE OR REPLACE VIEW v_learner_progress AS
SELECT
	l.id AS learner_id,
	l.cohort_id,
	l.full_name,
	count(mp.module_name) FILTER (WHERE mp.avancement IS NOT NULL) AS modules_ouverts,
	count(mp.module_name) FILTER (WHERE mp.statut = 'termine') AS modules_termines,
	count(mp.module_name) AS modules_total,
	round(avg(mp.avancement) FILTER (WHERE mp.avancement IS NOT NULL), 4) AS avancement,
	(SELECT round(avg(qa.score::numeric / NULLIF(qa.max_score, 0)), 4)
	   FROM quiz_attempts qa WHERE qa.learner_id = l.id) AS score_quiz_moyen,
	(SELECT count(*) FROM documents d WHERE d.learner_id = l.id) AS documents,
	c.code AS certificat_code,
	c.issued_on AS certificat_le
FROM learners l
LEFT JOIN v_module_progress mp ON mp.learner_id = l.id
LEFT JOIN certificates c ON c.learner_id = l.id
GROUP BY l.id, l.cohort_id, l.full_name, c.code, c.issued_on;
--> statement-breakpoint

-- Éligibilité au certificat : 80 % d'avancement, tous les modules ouverts
-- commencés, et le quiz final passé. Le certificat reste délivré à la main.
CREATE OR REPLACE VIEW v_certificate_eligibility AS
SELECT
	p.learner_id,
	p.cohort_id,
	p.full_name,
	p.avancement,
	(c.id IS NOT NULL) AS deja_delivre,
	(
		p.avancement >= 0.80
		AND NOT EXISTS (
			SELECT 1 FROM v_module_progress mp
			WHERE mp.learner_id = p.learner_id AND mp.statut = 'non_commence'
		)
		AND EXISTS (
			SELECT 1 FROM quiz_attempts qa
			JOIN quizzes q ON q.id = qa.quiz_id
			WHERE qa.learner_id = p.learner_id AND NOT q.is_baseline
		)
	) AS eligible
FROM v_learner_progress p
LEFT JOIN certificates c ON c.learner_id = p.learner_id;
