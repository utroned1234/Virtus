CREATE TABLE IF NOT EXISTS "DailyProfitRun" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "last_run_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyProfitRun_pkey" PRIMARY KEY ("id")
);
