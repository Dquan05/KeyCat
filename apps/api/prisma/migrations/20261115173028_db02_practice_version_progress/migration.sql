-- CreateEnum
CREATE TYPE "speed_mode" AS ENUM ('TIME', 'WORDS');

-- CreateEnum
CREATE TYPE "target_kind" AS ENUM ('LESSON', 'SPEED_TEST', 'CUSTOM_TEMPLATE');

-- CreateEnum
CREATE TYPE "content_kind" AS ENUM ('TEXT', 'SPEED_CONFIG', 'GAME_CONTENT', 'INTRO');

-- CreateEnum
CREATE TYPE "template_type" AS ENUM ('TEXT', 'GAME_CONTENT');

-- CreateEnum
CREATE TYPE "template_visibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "template_status" AS ENUM ('DRAFT_PRIVATE', 'PENDING_REVIEW', 'APPROVED_PUBLISHED', 'REJECTED', 'HIDDEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "attempt_mode" AS ENUM ('LESSON', 'SPEED_TIME', 'SPEED_WORDS', 'TEMPLATE_TEXT', 'TEMPLATE_GAME_CONTENT');

-- CreateEnum
CREATE TYPE "attempt_status" AS ENUM ('READY', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "finalization_operation" AS ENUM ('FINISH', 'ABANDON');

-- CreateTable
CREATE TABLE "speed_test_configs" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "mode" "speed_mode" NOT NULL,
    "time_limit_sec" INTEGER,
    "word_target" INTEGER,
    "punctuation_enabled" BOOLEAN NOT NULL DEFAULT false,
    "numbers_enabled" BOOLEAN NOT NULL DEFAULT false,
    "word_pool_version" VARCHAR(80) NOT NULL,
    "generator_version" VARCHAR(80) NOT NULL,
    "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speed_test_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_templates" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "type" "template_type" NOT NULL,
    "visibility" "template_visibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "template_status" NOT NULL DEFAULT 'DRAFT_PRIVATE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_targets" (
    "id" UUID NOT NULL,
    "kind" "target_kind" NOT NULL,
    "lesson_id" UUID,
    "speed_config_id" UUID,
    "custom_template_id" UUID,
    "current_content_version_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "content_kind" "content_kind" NOT NULL,
    "content_text" TEXT,
    "config_json" JSONB NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "source_name" VARCHAR(160),
    "source_url" TEXT,
    "license" VARCHAR(80),
    "attribution" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "content_version_id" UUID NOT NULL,
    "mode" "attempt_mode" NOT NULL,
    "status" "attempt_status" NOT NULL DEFAULT 'READY',
    "config_snapshot" JSONB NOT NULL,
    "scoring_version" VARCHAR(80) NOT NULL,
    "typing_core_version" VARCHAR(80) NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "first_input_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_results" (
    "attempt_id" UUID NOT NULL,
    "effective_wpm" DECIMAL(10,2),
    "first_try_accuracy" DECIMAL(5,2),
    "accuracy_final" DECIMAL(5,2),
    "gross_wpm" DECIMAL(10,2),
    "duration_ms" BIGINT,
    "scored_correct_count" INTEGER,
    "score" INTEGER,
    "stars" SMALLINT,
    "passed" BOOLEAN,
    "verified" BOOLEAN NOT NULL,
    "eligible_for_ranking" BOOLEAN NOT NULL,
    "metric_json" JSONB NOT NULL DEFAULT '{}',
    "scoring_version" VARCHAR(80) NOT NULL,
    "finalized_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_results_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "practice_key_stats" (
    "attempt_id" UUID NOT NULL,
    "key_label" VARCHAR(32) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "correct_first_try" INTEGER NOT NULL,
    "mistakes" INTEGER NOT NULL,
    "avg_latency_ms" DECIMAL(10,2),

    CONSTRAINT "practice_key_stats_pkey" PRIMARY KEY ("attempt_id","key_label")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "best_score" INTEGER,
    "best_stars" SMALLINT,
    "best_wpm" DECIMAL(10,2),
    "best_attempt_id" UUID,
    "passed_at" TIMESTAMPTZ(6),
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("user_id","lesson_id")
);

-- CreateTable
CREATE TABLE "practice_partial_snapshots" (
    "attempt_id" UUID NOT NULL,
    "cursor_position" INTEGER NOT NULL,
    "active_time_ms" BIGINT NOT NULL,
    "partial_metric_json" JSONB NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_partial_snapshots_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "attempt_finalization_requests" (
    "attempt_id" UUID NOT NULL,
    "operation" "finalization_operation" NOT NULL,
    "idempotency_key" VARCHAR(160) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "response_json" JSONB NOT NULL,
    "http_status" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempt_finalization_requests_pkey" PRIMARY KEY ("attempt_id","operation","idempotency_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "speed_test_configs_slug_key" ON "speed_test_configs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "practice_targets_lesson_id_key" ON "practice_targets"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_targets_speed_config_id_key" ON "practice_targets"("speed_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_targets_custom_template_id_key" ON "practice_targets"("custom_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_target_id_version_no_key" ON "content_versions"("target_id", "version_no");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_id_target_id_key" ON "content_versions"("id", "target_id");

-- CreateIndex
CREATE INDEX "practice_attempts_user_id_created_at_id_idx" ON "practice_attempts"("user_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "practice_attempts_target_id_created_at_idx" ON "practice_attempts"("target_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "practice_results_eligible_for_ranking_effective_wpm_idx" ON "practice_results"("eligible_for_ranking", "effective_wpm" DESC);

-- CreateIndex
CREATE INDEX "practice_partial_snapshots_captured_at_idx" ON "practice_partial_snapshots"("captured_at");

-- AddForeignKey
ALTER TABLE "custom_templates" ADD CONSTRAINT "custom_templates_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_targets" ADD CONSTRAINT "practice_targets_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_targets" ADD CONSTRAINT "practice_targets_speed_config_id_fkey" FOREIGN KEY ("speed_config_id") REFERENCES "speed_test_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_targets" ADD CONSTRAINT "practice_targets_custom_template_id_fkey" FOREIGN KEY ("custom_template_id") REFERENCES "custom_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "practice_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "practice_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_content_version_id_target_id_fkey" FOREIGN KEY ("content_version_id", "target_id") REFERENCES "content_versions"("id", "target_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "practice_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_key_stats" ADD CONSTRAINT "practice_key_stats_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "practice_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_best_attempt_id_fkey" FOREIGN KEY ("best_attempt_id") REFERENCES "practice_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_partial_snapshots" ADD CONSTRAINT "practice_partial_snapshots_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "practice_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_finalization_requests" ADD CONSTRAINT "attempt_finalization_requests_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "practice_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints not representable in Prisma's schema DSL.
ALTER TABLE "speed_test_configs" ADD CONSTRAINT "speed_test_configs_mode_check" CHECK (
    ("mode" = 'TIME' AND "time_limit_sec" > 0 AND "word_target" IS NULL) OR
    ("mode" = 'WORDS' AND "word_target" > 0 AND "time_limit_sec" IS NULL)
);
ALTER TABLE "practice_targets" ADD CONSTRAINT "practice_targets_owner_check" CHECK (
    num_nonnulls("lesson_id", "speed_config_id", "custom_template_id") = 1 AND
    (("kind" = 'LESSON' AND "lesson_id" IS NOT NULL) OR
     ("kind" = 'SPEED_TEST' AND "speed_config_id" IS NOT NULL) OR
     ("kind" = 'CUSTOM_TEMPLATE' AND "custom_template_id" IS NOT NULL))
);
ALTER TABLE "practice_targets" ADD CONSTRAINT "practice_targets_current_version_fkey"
    FOREIGN KEY ("current_content_version_id", "id") REFERENCES "content_versions"("id", "target_id") ON DELETE RESTRICT;
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_number_check" CHECK ("version_no" > 0);
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_text_check" CHECK ("content_kind" <> 'TEXT' OR ("content_text" IS NOT NULL AND length("content_text") > 0));
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_expiry_check" CHECK ("expires_at" > "created_at");
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_metrics_check" CHECK (
    ("effective_wpm" IS NULL OR "effective_wpm" >= 0) AND
    ("gross_wpm" IS NULL OR "gross_wpm" >= 0) AND
    ("first_try_accuracy" IS NULL OR "first_try_accuracy" BETWEEN 0 AND 100) AND
    ("accuracy_final" IS NULL OR "accuracy_final" BETWEEN 0 AND 100) AND
    ("duration_ms" IS NULL OR "duration_ms" >= 0) AND
    ("scored_correct_count" IS NULL OR "scored_correct_count" >= 0) AND
    ("score" IS NULL OR "score" BETWEEN 0 AND 150) AND
    ("stars" IS NULL OR "stars" BETWEEN 0 AND 5) AND
    (NOT "eligible_for_ranking" OR "verified")
);
ALTER TABLE "practice_key_stats" ADD CONSTRAINT "practice_key_stats_nonnegative_check" CHECK (
    "attempts" >= 0 AND "correct_first_try" >= 0 AND "mistakes" >= 0 AND
    ("avg_latency_ms" IS NULL OR "avg_latency_ms" >= 0)
);
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_metrics_check" CHECK (
    "attempts_count" >= 0 AND ("best_score" IS NULL OR "best_score" BETWEEN 0 AND 150) AND
    ("best_stars" IS NULL OR "best_stars" BETWEEN 0 AND 5) AND
    ("best_wpm" IS NULL OR "best_wpm" >= 0)
);
ALTER TABLE "practice_partial_snapshots" ADD CONSTRAINT "practice_partial_snapshots_nonnegative_check" CHECK (
    "cursor_position" >= 0 AND "active_time_ms" >= 0
);
