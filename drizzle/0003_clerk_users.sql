CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"clerk_created_at" timestamp with time zone,
	"clerk_updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Hand-added: adopt every user id already in the data, so the foreign keys
-- below validate against a live database instead of failing on the first
-- existing row. These are bare ids; scripts/sync-clerk-users.mjs fills in the
-- profiles and the Clerk webhook keeps them current.
INSERT INTO "users" ("id")
SELECT "user_id" FROM "exam_results"
UNION SELECT "user_id" FROM "exam_sessions"
UNION SELECT "user_id" FROM "free_claims"
UNION SELECT "user_id" FROM "played_audio"
UNION SELECT "user_id" FROM "purchases"
UNION SELECT "user_id" FROM "user_settings";--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "free_claims" ADD CONSTRAINT "free_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "played_audio" ADD CONSTRAINT "played_audio_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;