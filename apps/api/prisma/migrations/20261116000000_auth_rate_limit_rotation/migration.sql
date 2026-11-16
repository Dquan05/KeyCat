-- AUTH-01/02: persist rate limits across API processes and prevent a refresh
-- session from branching into more than one rotated successor.
CREATE TABLE "auth_rate_limits" (
    "key_hash" VARCHAR(64) NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "count" INTEGER NOT NULL,
    CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("key_hash"),
    CONSTRAINT "auth_rate_limits_count_check" CHECK ("count" >= 0)
);

CREATE UNIQUE INDEX "refresh_sessions_rotated_from_id_key" ON "refresh_sessions"("rotated_from_id");
