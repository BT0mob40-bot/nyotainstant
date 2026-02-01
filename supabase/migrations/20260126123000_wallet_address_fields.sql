-- Add optional wallet address requirement to tokens and destination fields to payments
-- Timestamp: 2026-01-26 12:30:00

BEGIN;

-- Trading tokens: require wallet address at purchase and allowed networks (comma-separated text)
ALTER TABLE public.trading_tokens
  ADD COLUMN IF NOT EXISTS require_wallet_address BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS address_networks TEXT;

-- Meme coins: mirror the same optional fields for consistency
ALTER TABLE public.meme_coins
  ADD COLUMN IF NOT EXISTS require_wallet_address BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS address_networks TEXT;

-- Payment requests: store destination wallet address and network when provided
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS destination_address TEXT,
  ADD COLUMN IF NOT EXISTS destination_network TEXT;

COMMIT;
