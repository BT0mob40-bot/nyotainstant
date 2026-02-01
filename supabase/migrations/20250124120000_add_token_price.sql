-- Add current_price column to trading_tokens table
ALTER TABLE trading_tokens 
ADD COLUMN IF NOT EXISTS current_price DECIMAL(20, 8) DEFAULT 0;

-- Update existing tokens with some default prices if needed (optional)
-- UPDATE trading_tokens SET current_price = 0 WHERE current_price IS NULL;
