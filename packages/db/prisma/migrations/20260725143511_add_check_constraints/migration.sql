-- Prevent self-kudos
ALTER TABLE "kudos"
  ADD CONSTRAINT "kudos_no_self_kudo_check"
  CHECK ("sender_id" <> "recipient_id");

-- Points must be in valid range
ALTER TABLE "kudos"
  ADD CONSTRAINT "kudos_points_range_check"
  CHECK ("points" BETWEEN 10 AND 50);

-- Non-empty message
ALTER TABLE "kudos"
  ADD CONSTRAINT "kudos_message_nonempty_check"
  CHECK (char_length("message") > 0);

-- Reward cost positive
ALTER TABLE "rewards"
  ADD CONSTRAINT "rewards_cost_positive_check"
  CHECK ("cost_points" > 0);

-- Password provider must have password hash
ALTER TABLE "auth_identities"
  ADD CONSTRAINT "auth_identities_password_hash_required_check"
  CHECK ("provider" != 'PASSWORD' OR "password_hash" IS NOT NULL);

-- Partial index for feed pagination (excludes soft-deleted)
CREATE INDEX "kudos_feed_idx"
  ON "kudos" ("created_at" DESC)
  WHERE "deleted_at" IS NULL;

-- Partial index for admin PENDING redemption queue is already covered by (status, createdAt)
-- Partial index for orphan media cleanup
CREATE INDEX "media_assets_pending_idx"
  ON "media_assets" ("created_at")
  WHERE "status" = 'PENDING';

-- Partial index for unread notification badge
CREATE INDEX "notifications_unread_idx"
  ON "notifications" ("user_id")
  WHERE "read_at" IS NULL;
