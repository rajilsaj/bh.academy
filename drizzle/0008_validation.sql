-- Une inscription attend la validation d'un administrateur avant d'ouvrir
-- l'espace apprenant. Les apprenants déjà présents sont validés d'office.
ALTER TABLE "learners" ADD COLUMN IF NOT EXISTS "validated_at" timestamp with time zone;--> statement-breakpoint
UPDATE "learners" SET "validated_at" = "created_at" WHERE "validated_at" IS NULL;
