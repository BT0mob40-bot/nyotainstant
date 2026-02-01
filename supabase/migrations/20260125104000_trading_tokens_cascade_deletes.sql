DO $$
BEGIN
  -- user_balances.token_id -> trading_tokens(id) ON DELETE CASCADE
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'user_balances_token_id_fkey'
      AND table_name = 'user_balances'
  ) THEN
    ALTER TABLE public.user_balances
      DROP CONSTRAINT user_balances_token_id_fkey;
  END IF;
  ALTER TABLE public.user_balances
    ADD CONSTRAINT user_balances_token_id_fkey
    FOREIGN KEY (token_id) REFERENCES public.trading_tokens(id) ON DELETE CASCADE;

  -- payment_requests.token_id -> trading_tokens(id) ON DELETE CASCADE
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_requests_token_id_fkey'
      AND table_name = 'payment_requests'
  ) THEN
    ALTER TABLE public.payment_requests
      DROP CONSTRAINT payment_requests_token_id_fkey;
  END IF;
  ALTER TABLE public.payment_requests
    ADD CONSTRAINT payment_requests_token_id_fkey
    FOREIGN KEY (token_id) REFERENCES public.trading_tokens(id) ON DELETE CASCADE;

  -- crypto_transactions.token_id -> trading_tokens(id) ON DELETE CASCADE
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'crypto_transactions_token_id_fkey'
      AND table_name = 'crypto_transactions'
  ) THEN
    ALTER TABLE public.crypto_transactions
      DROP CONSTRAINT crypto_transactions_token_id_fkey;
  END IF;
  ALTER TABLE public.crypto_transactions
    ADD CONSTRAINT crypto_transactions_token_id_fkey
    FOREIGN KEY (token_id) REFERENCES public.trading_tokens(id) ON DELETE CASCADE;
END$$;
