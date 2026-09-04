-- L'inscription passe par Google : chaque apprenant porte l'identifiant
-- Google stable (`sub`) de son compte, unique. Un compte, une inscription.
ALTER TABLE "learners" ADD COLUMN IF NOT EXISTS "google_sub" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learners_google_sub_idx" ON "learners" ("google_sub");
