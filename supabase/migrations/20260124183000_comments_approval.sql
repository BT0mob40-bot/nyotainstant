-- Add approval status and admin flag to comments
ALTER TABLE public.meme_coin_comments 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_admin_post BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS user_name TEXT; -- For admin to set a custom name

-- Update existing comments to be approved by default (so we don't hide history)
UPDATE public.meme_coin_comments SET is_approved = true WHERE is_approved IS FALSE;

-- Create policy to allow anyone to read APPROVED comments
DROP POLICY IF EXISTS "Public Read Comments" ON public.meme_coin_comments;
CREATE POLICY "Public Read Approved Comments"
ON public.meme_coin_comments FOR SELECT
USING (is_approved = true OR auth.uid() = user_id);

-- Admin policy to read ALL comments (we'll need to check if admins have special role or just check logic in app)
-- Ideally we use a role, but for now we might rely on the application logic if RLS is not strict on "admin" role.
-- Assuming 'admin' role or just letting authenticated users read all isn't great if we want to hide unapproved.
-- Let's stick to: Public sees approved. Author sees their own. 
-- Admins need to see everything.
-- If there is an admin table or role, we should use it. 
-- Based on previous context, `isAdmin` checks `admin_users` table usually.

-- Let's verify admin access.
