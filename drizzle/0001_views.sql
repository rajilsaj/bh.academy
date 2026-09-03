-- Vues calculées. Le niveau (Vert/Orange/Rouge/Bleu) n'est jamais stocké :
-- il se déduit à chaque lecture des événements (présences, quiz, réponses, résultats).

-- Vagues déjà fermées, de la plus récemment fermée à la plus ancienne.
CREATE OR REPLACE VIEW v_closed_waves AS
SELECT
	w.id,
	w.code,
	w.label_fr,
	w.opens_at,
	w.closes_at,
	row_number() OVER (ORDER BY w.closes_at DESC, w.code DESC) AS recency
FROM waves w
WHERE w.closes_at IS NOT NULL AND w.closes_at <= now();
--> statement-breakpoint

-- Vagues actuellement ouvertes (ouvertes et pas encore fermées).
CREATE OR REPLACE VIEW v_open_waves AS
SELECT w.id, w.code, w.label_fr, w.opens_at, w.closes_at
FROM waves w
WHERE w.opens_at IS NOT NULL
  AND w.opens_at <= now()
  AND (w.closes_at IS NULL OR w.closes_at > now());
--> statement-breakpoint

-- Assiduité : on ne compte que les sessions déjà tenues.
CREATE OR REPLACE VIEW v_learner_attendance AS
SELECT
	l.id AS learner_id,
	count(s.id) AS sessions_total,
	count(a.session_id) AS sessions_attended,
	CASE
		WHEN count(s.id) = 0 THEN NULL
		ELSE round(count(a.session_id)::numeric / count(s.id), 4)
	END AS attendance_rate
FROM learners l
LEFT JOIN sessions s
	ON s.cohort_id = l.cohort_id AND s.held_on <= current_date
LEFT JOIN attendance a
	ON a.learner_id = l.id AND a.session_id = s.id
GROUP BY l.id;
--> statement-breakpoint

-- Plus longue série d'absences consécutives (méthode « gaps and islands »).
CREATE OR REPLACE VIEW v_learner_absence_streak AS
WITH ordered AS (
	SELECT
		l.id AS learner_id,
		(a.session_id IS NULL) AS absent,
		row_number() OVER (PARTITION BY l.id ORDER BY s.held_on, s.id) AS rn
	FROM learners l
	JOIN sessions s
		ON s.cohort_id = l.cohort_id AND s.held_on <= current_date
	LEFT JOIN attendance a
		ON a.learner_id = l.id AND a.session_id = s.id
), grouped AS (
	SELECT
		learner_id,
		absent,
		rn - row_number() OVER (PARTITION BY learner_id, absent ORDER BY rn) AS island
	FROM ordered
), islands AS (
	SELECT learner_id, count(*) AS streak
	FROM grouped
	WHERE absent
	GROUP BY learner_id, island
)
SELECT learner_id, max(streak) AS max_consecutive_absences
FROM islands
GROUP BY learner_id;
--> statement-breakpoint

-- Niveau de chaque apprenant, dans l'ordre de priorité Bleu > Rouge > Orange > Vert.
CREATE OR REPLACE VIEW v_learner_level AS
WITH last_two AS (
	SELECT id FROM v_closed_waves WHERE recency <= 2
), last_one AS (
	SELECT id FROM v_closed_waves WHERE recency = 1
), closed_count AS (
	SELECT count(*) AS n FROM v_closed_waves
), base AS (
	SELECT
		l.id AS learner_id,
		l.cohort_id,
		l.full_name,
		EXISTS (
			SELECT 1 FROM outcomes o
			WHERE o.learner_id = l.id
			  AND o.outcome_type IN ('emploi', 'stage', 'mission', 'projet')
		) AS has_positive_outcome,
		(
			SELECT count(*) FROM responses r
			JOIN last_two lt ON lt.id = r.wave_id
			WHERE r.learner_id = l.id
		) AS responses_last_two,
		EXISTS (
			SELECT 1 FROM responses r
			JOIN last_one lo ON lo.id = r.wave_id
			WHERE r.learner_id = l.id
		) AS responded_last_closed,
		EXISTS (SELECT 1 FROM responses r WHERE r.learner_id = l.id) AS has_any_response,
		(SELECT count(*) FROM quiz_attempts qa WHERE qa.learner_id = l.id) AS quiz_attempts_count,
		(c.ends_on >= current_date) AS in_training
	FROM learners l
	JOIN cohorts c ON c.id = l.cohort_id
)
SELECT
	b.learner_id,
	b.cohort_id,
	b.full_name,
	att.sessions_total,
	att.sessions_attended,
	att.attendance_rate,
	COALESCE(streak.max_consecutive_absences, 0) AS max_consecutive_absences,
	b.responses_last_two,
	b.responded_last_closed,
	b.has_any_response,
	b.quiz_attempts_count,
	b.has_positive_outcome,
	CASE
		WHEN b.has_positive_outcome THEN 'Bleu'
		WHEN (SELECT n FROM closed_count) >= 1 AND b.responses_last_two = 0 THEN 'Rouge'
		WHEN b.in_training
			AND COALESCE(streak.max_consecutive_absences, 0) >= 2
			AND b.quiz_attempts_count = 0 THEN 'Rouge'
		WHEN b.has_any_response
			AND (SELECT n FROM closed_count) >= 1
			AND NOT b.responded_last_closed THEN 'Orange'
		WHEN att.attendance_rate IS NOT NULL AND att.attendance_rate < 0.70 THEN 'Orange'
		ELSE 'Vert'
	END AS level
FROM base b
LEFT JOIN v_learner_attendance att ON att.learner_id = b.learner_id
LEFT JOIN v_learner_absence_streak streak ON streak.learner_id = b.learner_id;
--> statement-breakpoint

-- Paires quiz initial / quiz final, en pourcentage pour rester comparable
-- même si les deux quiz n'ont pas le même barème.
CREATE OR REPLACE VIEW v_quiz_pairs AS
WITH baseline AS (
	SELECT qa.learner_id, max(qa.score::numeric / NULLIF(qa.max_score, 0)) AS pct
	FROM quiz_attempts qa
	JOIN quizzes q ON q.id = qa.quiz_id
	WHERE q.is_baseline
	GROUP BY qa.learner_id
), endline AS (
	SELECT qa.learner_id, max(qa.score::numeric / NULLIF(qa.max_score, 0)) AS pct
	FROM quiz_attempts qa
	JOIN quizzes q ON q.id = qa.quiz_id
	WHERE NOT q.is_baseline
	GROUP BY qa.learner_id
)
SELECT
	l.id AS learner_id,
	l.cohort_id,
	round(b.pct, 4) AS baseline_pct,
	round(e.pct, 4) AS endline_pct,
	round(e.pct - b.pct, 4) AS delta_pct
FROM learners l
JOIN baseline b ON b.learner_id = l.id
JOIN endline e ON e.learner_id = l.id;
--> statement-breakpoint

-- Indicateurs de la section 10, en format long (metric / dimension / value)
-- pour être directement exploitable dans Metabase.
CREATE OR REPLACE VIEW v_indicators AS
-- Taux de réponse par vague
SELECT
	'taux_reponse_vague'::text AS metric,
	w.code::text AS dimension,
	c.id AS cohort_id,
	c.name AS cohort_name,
	CASE WHEN count(l.id) = 0 THEN NULL
	     ELSE round(count(r.id)::numeric / count(l.id), 4) END AS value,
	'ratio'::text AS unit
FROM waves w
CROSS JOIN cohorts c
LEFT JOIN learners l ON l.cohort_id = c.id
LEFT JOIN responses r ON r.wave_id = w.id AND r.learner_id = l.id
GROUP BY w.code, w.opens_at, c.id, c.name

UNION ALL
-- Taux de présence global de la promotion
SELECT
	'taux_presence_global',
	'global',
	c.id,
	c.name,
	CASE WHEN count(att.sessions_total) = 0 OR sum(att.sessions_total) = 0 THEN NULL
	     ELSE round(sum(att.sessions_attended)::numeric / sum(att.sessions_total), 4) END,
	'ratio'
FROM cohorts c
JOIN learners l ON l.cohort_id = c.id
JOIN v_learner_attendance att ON att.learner_id = l.id
GROUP BY c.id, c.name

UNION ALL
-- Taux de présence session par session
SELECT
	'taux_presence_seance',
	s.module_name || ' — ' || to_char(s.held_on, 'DD/MM/YYYY'),
	c.id,
	c.name,
	CASE WHEN count(DISTINCT l.id) = 0 THEN NULL
	     ELSE round(count(DISTINCT a.learner_id)::numeric / count(DISTINCT l.id), 4) END,
	'ratio'
FROM sessions s
JOIN cohorts c ON c.id = s.cohort_id
LEFT JOIN learners l ON l.cohort_id = c.id
LEFT JOIN attendance a ON a.session_id = s.id
WHERE s.held_on <= current_date
GROUP BY s.id, s.module_name, s.held_on, c.id, c.name

UNION ALL
-- Nombre d'apprenants disposant d'une paire quiz initial / quiz final
SELECT
	'paires_quiz',
	'global',
	c.id,
	c.name,
	count(p.learner_id)::numeric,
	'count'
FROM cohorts c
LEFT JOIN v_quiz_pairs p ON p.cohort_id = c.id
GROUP BY c.id, c.name

UNION ALL
-- Progression moyenne entre le quiz initial et le quiz final
SELECT
	'delta_moyen_quiz',
	'global',
	c.id,
	c.name,
	round(avg(p.delta_pct), 4),
	'ratio'
FROM cohorts c
LEFT JOIN v_quiz_pairs p ON p.cohort_id = c.id
GROUP BY c.id, c.name

UNION ALL
-- Documents produits, par type (toutes versions confondues)
SELECT
	'documents_par_type',
	d.doc_type,
	c.id,
	c.name,
	count(d.id)::numeric,
	'count'
FROM documents d
JOIN learners l ON l.id = d.learner_id
JOIN cohorts c ON c.id = l.cohort_id
GROUP BY d.doc_type, c.id, c.name

UNION ALL
-- Résultats à 3 mois : issues survenues dans les 90 jours suivant la fin de la formation
SELECT
	'resultats_M3',
	o.outcome_type,
	c.id,
	c.name,
	count(o.id)::numeric,
	'count'
FROM outcomes o
JOIN learners l ON l.id = o.learner_id
JOIN cohorts c ON c.id = l.cohort_id
WHERE o.occurred_on <= c.ends_on + INTERVAL '90 days'
GROUP BY o.outcome_type, c.id, c.name

UNION ALL
-- Résultats à 6 mois : issues survenues dans les 180 jours suivant la fin de la formation
SELECT
	'resultats_M6',
	o.outcome_type,
	c.id,
	c.name,
	count(o.id)::numeric,
	'count'
FROM outcomes o
JOIN learners l ON l.id = o.learner_id
JOIN cohorts c ON c.id = l.cohort_id
WHERE o.occurred_on <= c.ends_on + INTERVAL '180 days'
GROUP BY o.outcome_type, c.id, c.name

UNION ALL
-- Taux d'insertion : part des apprenants avec au moins une issue emploi/stage/mission/projet
SELECT
	'taux_insertion',
	horizon.label,
	c.id,
	c.name,
	CASE WHEN count(DISTINCT l.id) = 0 THEN NULL
	     ELSE round(count(DISTINCT o.learner_id)::numeric / count(DISTINCT l.id), 4) END,
	'ratio'
FROM cohorts c
JOIN learners l ON l.cohort_id = c.id
CROSS JOIN (VALUES ('M3', 90), ('M6', 180)) AS horizon(label, days)
LEFT JOIN outcomes o
	ON o.learner_id = l.id
	AND o.outcome_type IN ('emploi', 'stage', 'mission', 'projet')
	AND o.occurred_on <= c.ends_on + (horizon.days || ' days')::interval
GROUP BY horizon.label, c.id, c.name

UNION ALL
-- Répartition par niveau
SELECT
	'repartition_niveau',
	v.level,
	c.id,
	c.name,
	count(*)::numeric,
	'count'
FROM v_learner_level v
JOIN cohorts c ON c.id = v.cohort_id
GROUP BY v.level, c.id, c.name;
