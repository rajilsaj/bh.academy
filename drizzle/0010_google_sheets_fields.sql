-- Add Google Sheets form fields to learners table
ALTER TABLE "learners" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "learners" ADD COLUMN IF NOT EXISTS "gender" text;
ALTER TABLE "learners" ADD COLUMN IF NOT EXISTS "date_of_birth" text;
ALTER TABLE "learners" ADD COLUMN IF NOT EXISTS "id_document_url" text;
ALTER TABLE "learners" ADD COLUMN IF NOT EXISTS "cv_url" text;
ALTER TABLE "learners" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "learners" ADD COLUMN IF NOT EXISTS "form_submitted_at" timestamp with time zone;
