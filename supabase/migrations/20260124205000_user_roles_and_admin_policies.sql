CREATE TABLE
IF NOT EXISTS user_roles
(
  user_id UUID PRIMARY KEY REFERENCES auth.users
(id) ON
DELETE CASCADE,
  role TEXT
NOT NULL CHECK
(role IN
('admin')),
  created_at TIMESTAMPTZ DEFAULT NOW
()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin
()
RETURNS BOOLEAN AS $$
SELECT EXISTS
(
    SELECT 1
FROM user_roles
WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_roles'
    AND policyname = 'Admins can view roles'
  ) THEN
  CREATE POLICY "Admins can view roles"
    ON user_roles FOR
  SELECT
    USING (is_admin());
END
IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_roles'
    AND policyname = 'Admins can insert roles'
  ) THEN
  CREATE POLICY "Admins can insert roles"
    ON user_roles FOR
  INSERT
    WITH CHECK (is_admin())
  ;
END
IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_roles'
    AND policyname = 'Admins can update roles'
  ) THEN
  CREATE POLICY "Admins can update roles"
    ON user_roles FOR
  UPDATE
    USING (is_admin()
  )
    WITH CHECK
  (is_admin
  ());
END
IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_roles'
    AND policyname = 'Admins can delete roles'
  ) THEN
  CREATE POLICY "Admins can delete roles"
    ON user_roles FOR
  DELETE
    USING (is_admin
  ());
END
IF;
END$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Users can view own profile'
  ) THEN
  CREATE POLICY "Users can view own profile"
    ON profiles FOR
  SELECT
    USING (auth.uid() = id);
END
IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Admins can view all profiles'
  ) THEN
  CREATE POLICY "Admins can view all profiles"
    ON profiles FOR
  SELECT
    USING (is_admin());
END
IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Admins can update profiles'
  ) THEN
  CREATE POLICY "Admins can update profiles"
    ON profiles FOR
  UPDATE
    USING (is_admin()
  )
    WITH CHECK
  (is_admin
  ());
END
IF;
END$$;

