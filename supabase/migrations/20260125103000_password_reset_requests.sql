CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed'))
);

ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'password_reset_requests'
      AND policyname = 'Admins can view all reset requests'
  ) THEN
    CREATE POLICY "Admins can view all reset requests"
      ON password_reset_requests FOR SELECT
      USING (is_admin());
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'password_reset_requests'
      AND policyname = 'Anyone can insert reset requests'
  ) THEN
    CREATE POLICY "Anyone can insert reset requests"
      ON password_reset_requests FOR INSERT
      WITH CHECK (true);
  END IF;
END$$;
