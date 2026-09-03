-- Deux rôles seulement : « admin » et « formateur ». Les anciens rôles de
-- l'équipe (directeur, formation, données) deviennent tous administrateurs.
UPDATE "staff" SET "role" = 'admin' WHERE "role" IN ('directeur', 'formation', 'donnees');
