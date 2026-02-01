-- Add social and description columns to trading_tokens
ALTER TABLE public.trading_tokens 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add display_name to meme_coin_comments for fake/admin comments
ALTER TABLE public.meme_coin_comments 
ADD COLUMN IF NOT EXISTS display_name TEXT;
