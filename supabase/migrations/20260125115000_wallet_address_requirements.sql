-- Add optional wallet address requirements to tokens
ALTER TABLE public.trading_tokens
  ADD COLUMN IF NOT EXISTS require_wallet_address BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS address_networks TEXT;

ALTER TABLE public.meme_coins
  ADD COLUMN IF NOT EXISTS require_wallet_address BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS address_networks TEXT;

-- Extend payment_requests to store destination address and chosen network
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS destination_address TEXT,
  ADD COLUMN IF NOT EXISTS destination_network TEXT;
