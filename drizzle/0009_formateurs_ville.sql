-- La ville où le formateur intervient (Brazzaville ou Pointe-Noire), pour
-- la liste des formateurs et son export Excel.
ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "city" text;
