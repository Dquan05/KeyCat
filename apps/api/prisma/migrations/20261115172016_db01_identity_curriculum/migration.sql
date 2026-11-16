-- CreateEnum
CREATE TYPE "account_role" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "verification_purpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "publication_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "lesson_type" AS ENUM ('INTRO', 'KEY_DRILL', 'REVIEW', 'PRACTICE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" VARCHAR(160),
    "avatar_url" TEXT,
    "role" "account_role" NOT NULL DEFAULT 'MEMBER',
    "status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(6),
    "timezone" VARCHAR(80),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "rotated_from_id" UUID,
    "device_label" VARCHAR(160),
    "last_used_at" TIMESTAMPTZ(6),

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "verification_purpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "ui_language" VARCHAR(2) NOT NULL DEFAULT 'vi',
    "theme_key" VARCHAR(80) NOT NULL DEFAULT 'light',
    "typing_font" VARCHAR(80),
    "font_size" INTEGER,
    "show_keyboard" BOOLEAN NOT NULL DEFAULT true,
    "show_hands" BOOLEAN NOT NULL DEFAULT true,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT false,
    "prefs_json" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "course_ordinal" INTEGER NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "lesson_type" "lesson_type" NOT NULL,
    "goal_wpm" DECIMAL(8,2),
    "min_accuracy" DECIMAL(5,2),
    "min_pass_wpm" DECIMAL(8,2),
    "policy_json" JSONB NOT NULL DEFAULT '{}',
    "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_token_hash_key" ON "refresh_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_sessions_user_id_revoked_at_expires_at_idx" ON "refresh_sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_purpose_expires_at_idx" ON "verification_tokens"("user_id", "purpose", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sections_course_id_order_index_key" ON "sections"("course_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "sections_id_course_id_key" ON "sections"("id", "course_id");

-- CreateIndex
CREATE INDEX "lessons_section_id_course_id_idx" ON "lessons"("section_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_course_id_course_ordinal_key" ON "lessons"("course_id", "course_ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_course_id_slug_key" ON "lessons"("course_id", "slug");

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_rotated_from_id_fkey" FOREIGN KEY ("rotated_from_id") REFERENCES "refresh_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_section_id_course_id_fkey" FOREIGN KEY ("section_id", "course_id") REFERENCES "sections"("id", "course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma cannot express these portable business checks in its schema DSL.
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized_check" CHECK ("email" = lower("email") AND "email" <> '');
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_ui_language_check" CHECK ("ui_language" IN ('vi', 'en'));
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_accuracy_range_check" CHECK ("min_accuracy" IS NULL OR ("min_accuracy" >= 0 AND "min_accuracy" <= 100));
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_wpm_nonnegative_check" CHECK (("goal_wpm" IS NULL OR "goal_wpm" >= 0) AND ("min_pass_wpm" IS NULL OR "min_pass_wpm" >= 0));
