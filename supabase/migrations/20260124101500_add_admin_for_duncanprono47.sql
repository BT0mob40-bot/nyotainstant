-- Migration: grant admin role to duncanprono47@gmail.com
-- Timestamp: 2026-01-24 10:15:00

BEGIN;

    -- Insert admin role for matching profile by email (id resolved via profiles)
    INSERT INTO public.user_roles
        (user_id, role)
    SELECT id, 'admin'
    ::app_role
FROM public.profiles
WHERE lower
    (email) = lower
    ('duncanprono47@gmail.com')
ON CONFLICT
    (user_id, role) DO NOTHING;

    COMMIT;
