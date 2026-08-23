-- Add creditsResetAt to support a lazy, reset-on-read AI credit cycle.
-- NULL (the default for all existing rows) is treated as "due now" by
-- src/lib/billing/credits.ts, so every existing user's balance true-ups to
-- their plan's cap the next time it's read.
ALTER TABLE "User" ADD COLUMN "creditsResetAt" TIMESTAMP(3);
