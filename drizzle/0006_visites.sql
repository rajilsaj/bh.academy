-- Mesure d'audience : une ligne par page vue, avec l'identifiant de visiteur
-- (cookie), l'adresse IP d'origine et le pays. Les agrégats (visiteurs uniques,
-- retours, pages d'atterrissage) sont calculés à la lecture.
CREATE TABLE IF NOT EXISTS "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"ip" text,
	"country" text,
	"city" text,
	"path" text NOT NULL,
	"referer" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_visitor_idx" ON "visits" ("visitor_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_created_idx" ON "visits" ("created_at");
