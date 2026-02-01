-- Add new columns to trading_tokens table
ALTER TABLE public.trading_tokens 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS market_cap DECIMAL(20, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS liquidity DECIMAL(20, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS holder_count INTEGER DEFAULT 0;
