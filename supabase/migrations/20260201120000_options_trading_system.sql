-- Options Trading System Migration (Simplified)
-- Uses existing fiat_balances and crypto_transactions tables

-- Add index for faster options trade queries
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_options 
ON public.crypto_transactions(user_id, transaction_type, notes) 
WHERE transaction_type = 'buy';

-- Add comment to document options trading usage
COMMENT ON COLUMN public.crypto_transactions.notes IS 
'For options trading: NULL = active trade, "won" = winning trade, "lost" = losing trade';

COMMENT ON COLUMN public.crypto_transactions.balance_before IS 
'For options trading: stores entry price * 1000000';

COMMENT ON COLUMN public.crypto_transactions.balance_after IS 
'For options trading: stores expiry timestamp';

COMMENT ON COLUMN public.crypto_transactions.token_id IS 
'For options trading: stores trading pair symbol (e.g., EUR/USD, BTC/USD)';
