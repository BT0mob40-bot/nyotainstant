-- Migration: remove unused columns from mpesa_configurations
-- Timestamp: 2026-01-24 12:00:00

BEGIN;

    -- Drop payment_type, till_number, and paybill_number columns (UI now uses paybill only)
    ALTER TABLE public.mpesa_configurations
  DROP COLUMN IF EXISTS payment_type
    ,
    DROP COLUMN
    IF EXISTS till_number,
    DROP COLUMN
    IF EXISTS paybill_number;

COMMIT;
