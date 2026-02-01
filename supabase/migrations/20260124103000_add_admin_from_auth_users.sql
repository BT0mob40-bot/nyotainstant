-- Migration: grant admin role by looking up auth.users email
-- Timestamp: 2026-01-24 10:30:00

BEGIN;

    -- Insert admin role by selecting user id from auth.users
    INSERT INTO public.user_roles
        (user_id, role)
    SELECT id, 'admin'
    ::app_role
FROM auth.users
WHERE lower
    (email) = lower
    ('duncanprono47@gmail.com')
ON CONFLICT
    (user_id, role) DO NOTHING;

    COMMIT;
