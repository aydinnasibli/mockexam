CREATE TABLE "exam_answers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"result_id" text NOT NULL,
	"question_id" text,
	"module_index" integer NOT NULL,
	"user_answer" integer NOT NULL,
	"user_answer_text" text DEFAULT '' NOT NULL,
	"correct_index" integer NOT NULL,
	"is_correct" boolean NOT NULL,
	"marks" integer DEFAULT 1 NOT NULL,
	"earned_marks" integer DEFAULT 0 NOT NULL,
	"time_seconds" integer DEFAULT 0 NOT NULL,
	"writing_score" numeric(3, 1),
	"writing_word_count" integer,
	"writing_criteria" jsonb,
	"ai_feedback" text,
	"writing_pending" boolean DEFAULT false NOT NULL,
	"q_stem" text DEFAULT '' NOT NULL,
	"q_options" text[] DEFAULT '{}' NOT NULL,
	"q_passage" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_results" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"exam_id" text NOT NULL,
	"exam_title" text NOT NULL,
	"exam_tag" text NOT NULL,
	"exam_type" text,
	"attempt_number" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"duration_seconds" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"overall_band" numeric(3, 1),
	"total_scaled" integer,
	"rw_scaled" integer,
	"math_scaled" integer,
	"module_scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"writing_grading_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_results_score_check" CHECK ("exam_results"."score" >= 0 AND "exam_results"."score" <= 100),
	CONSTRAINT "exam_results_duration_check" CHECK ("exam_results"."duration_seconds" >= 0),
	CONSTRAINT "exam_results_total_questions_check" CHECK ("exam_results"."total_questions" >= 0)
);
--> statement-breakpoint
CREATE TABLE "exam_sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"exam_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"total_seconds" integer NOT NULL,
	"module_schedule" jsonb,
	"progress" jsonb,
	"last_seen_at" timestamp with time zone,
	"expires_at" timestamp with time zone DEFAULT now() + interval '7 days' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"tag" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"features" text[] DEFAULT '{}' NOT NULL,
	"modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exams_type_check" CHECK ("exams"."type" IN ('sat', 'ielts', 'toefl', 'dim', 'gre', 'general_english')),
	CONSTRAINT "exams_price_check" CHECK ("exams"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "played_audio" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exam_id" text NOT NULL,
	"audio_url" text NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '24 hours' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"exam_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'AZN' NOT NULL,
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"order_history" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_status_check" CHECK ("purchases"."status" IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'))
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"exam_id" text NOT NULL,
	"module_index" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"type" text DEFAULT 'mcq' NOT NULL,
	"block_id" text DEFAULT '' NOT NULL,
	"passage" text DEFAULT '' NOT NULL,
	"audio_url" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"stem" text NOT NULL,
	"options" text[] DEFAULT '{}' NOT NULL,
	"open_answers" text[] DEFAULT '{}' NOT NULL,
	"correct_index" integer DEFAULT -1 NOT NULL,
	"match_items" text[] DEFAULT '{}' NOT NULL,
	"correct_matching" integer[] DEFAULT '{}' NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"writing_task_type" text,
	"min_words" integer,
	"max_words" integer,
	"rubric" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_module_index_check" CHECK ("questions"."module_index" >= 0),
	CONSTRAINT "questions_type_check" CHECK ("questions"."type" IN ('mcq', 'open', 'matching', 'writing')),
	CONSTRAINT "questions_writing_task_type_check" CHECK ("questions"."writing_task_type" IS NULL OR "questions"."writing_task_type" IN ('task1', 'task2', 'integrated', 'independent', 'general'))
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"target_exam_date" text,
	"target_exam_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_target_exam_type_check" CHECK ("user_settings"."target_exam_type" IS NULL OR "user_settings"."target_exam_type" IN ('sat', 'ielts', 'toefl', 'dim', 'gre', 'general_english'))
);
--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_result_id_exam_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."exam_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "played_audio" ADD CONSTRAINT "played_audio_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_answers_result_idx" ON "exam_answers" USING btree ("result_id");--> statement-breakpoint
CREATE INDEX "exam_answers_writing_queue_idx" ON "exam_answers" USING btree ("result_id") WHERE "exam_answers"."writing_pending";--> statement-breakpoint
CREATE UNIQUE INDEX "exam_results_attempt_key" ON "exam_results" USING btree ("user_id","exam_id","attempt_number");--> statement-breakpoint
CREATE INDEX "exam_results_user_recent_idx" ON "exam_results" USING btree ("user_id","completed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "exam_results_exam_idx" ON "exam_results" USING btree ("exam_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_sessions_user_exam_key" ON "exam_sessions" USING btree ("user_id","exam_id");--> statement-breakpoint
CREATE INDEX "exam_sessions_expiry_idx" ON "exam_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "exams_active_idx" ON "exams" USING btree ("is_active") WHERE "exams"."is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "played_audio_claim_key" ON "played_audio" USING btree ("user_id","exam_id","audio_url");--> statement-breakpoint
CREATE INDEX "played_audio_expiry_idx" ON "played_audio" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_user_exam_key" ON "purchases" USING btree ("user_id","exam_id");--> statement-breakpoint
CREATE INDEX "purchases_entitlement_idx" ON "purchases" USING btree ("user_id","exam_id") WHERE "purchases"."status" = 'COMPLETED';--> statement-breakpoint
CREATE UNIQUE INDEX "questions_slot_key" ON "questions" USING btree ("exam_id","module_index","order");