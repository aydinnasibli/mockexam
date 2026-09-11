CREATE TABLE "free_claims" (
	"user_id" text PRIMARY KEY NOT NULL,
	"exam_id" text NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exams" DROP CONSTRAINT "exams_type_check";--> statement-breakpoint
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_target_exam_type_check";--> statement-breakpoint
ALTER TABLE "free_claims" ADD CONSTRAINT "free_claims_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "free_claims_exam_idx" ON "free_claims" USING btree ("exam_id");--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_type_check" CHECK ("exams"."type" IN ('sat', 'ielts', 'toefl', 'dim', 'masters', 'driving', 'gre', 'general_english'));--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_target_exam_type_check" CHECK ("user_settings"."target_exam_type" IS NULL OR "user_settings"."target_exam_type" IN ('sat', 'ielts', 'toefl', 'dim', 'masters', 'driving', 'gre', 'general_english'));