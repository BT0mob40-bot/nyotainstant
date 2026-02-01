DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trading_tokens'
      AND policyname = 'Admins can delete trading tokens (is_admin)'
  ) THEN
    CREATE POLICY "Admins can delete trading tokens (is_admin)"
      ON public.trading_tokens
      FOR DELETE
      USING (is_admin());
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meme_coins'
      AND policyname = 'Admins can delete meme coins (is_admin)'
  ) THEN
    CREATE POLICY "Admins can delete meme coins (is_admin)"
      ON public.meme_coins
      FOR DELETE
      USING (is_admin());
  END IF;
END$$;
