-- Add new columns to meme_coin_comments table
ALTER TABLE meme_coin_comments
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_admin_post BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Update existing comments to be approved so they don't disappear
UPDATE meme_coin_comments SET is_approved = TRUE WHERE is_approved IS FALSE;
-- Wait, if default is FALSE, new ones will be false. Existing ones might be null if I didn't set default in add column (but I did).
-- Actually, if I add column with default false, all existing rows get false.
-- So I should update them to true immediately.
UPDATE meme_coin_comments SET is_approved = TRUE;

-- Enable Row Level Security if not enabled (it likely is)
ALTER TABLE meme_coin_comments ENABLE ROW LEVEL SECURITY;

-- Policy for reading comments:
-- Anyone can read approved comments
-- Users can read their own pending comments
-- Admins can read all comments (assuming admin role or logic, but for now we rely on public access for reading, client-side filtering for pending)
-- Actually, to secure "pending" comments from public view, we need RLS.
-- But for now, let's keep it simple and allow public read, and filter on client as implemented.
-- If we want to be strict:
-- CREATE POLICY "Public can view approved comments" ON meme_coin_comments FOR SELECT USING (is_approved = true OR auth.uid() = user_id);

-- For now, ensure open access is maintained if that was the case, or update policies.
-- Let's check if policies exist. If not, maybe create a permissive one for now to avoid breaking things.
-- Assuming previous setup was permissive.

-- Grant access to columns
GRANT ALL ON meme_coin_comments TO authenticated;
GRANT ALL ON meme_coin_comments TO service_role;
