-- Les formateurs sont présentés sur la vitrine : une photo (chemin dans le
-- stockage) et un lien Facebook en plus du LinkedIn déjà présent.
ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "facebook" text;--> statement-breakpoint
ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "photo_path" text;
