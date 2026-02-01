-- Ensure image_url and other metadata fields exist in trading_tokens
ALTER TABLE public.trading_tokens 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure is_active defaults to true
ALTER TABLE public.trading_tokens 
ALTER COLUMN is_active SET DEFAULT true;
