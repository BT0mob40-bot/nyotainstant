-- Migration: create `settings` table
-- Timestamp: 2026-01-23 12:00:00

-- Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION
IF NOT EXISTS pgcrypto;

BEGIN;

    -- Create a generic settings table to store key/value configuration
    CREATE TABLE
    IF NOT EXISTS public.settings
    (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid
    (),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now
    ()
);

COMMIT;

-- Rollback (optional): drop table if you need to revert
-- DROP TABLE IF EXISTS public.settings;
