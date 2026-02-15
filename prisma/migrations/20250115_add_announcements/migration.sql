CREATE TABLE IF NOT EXISTS "Announcement" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Announcement_is_active_idx" ON "Announcement" ("is_active");
CREATE INDEX IF NOT EXISTS "Announcement_created_at_idx" ON "Announcement" ("created_at");
