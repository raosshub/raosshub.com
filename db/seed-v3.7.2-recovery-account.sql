-- ============================================================
-- v3.7.2 — Recovery account DB migration
-- Adds is_recovery and recovery_email columns to users table.
-- Safe to run on any existing install — uses IF NOT EXISTS.
-- The recovery account itself is created by DataInitializer
-- on the next backend restart (createRecoveryAccountIfMissing).
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_recovery   BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(255);
