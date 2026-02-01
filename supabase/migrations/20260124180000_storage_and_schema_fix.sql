-- Create a storage bucket for token images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('token-images', 'token-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to ensure clean slate and avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Create policies for the token-images bucket

-- 1. Allow public read access to all files in the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'token-images' );

-- 2. Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'token-images' );

-- 3. Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'token-images' );

-- 4. Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'token-images' );

-- Ensure trading_tokens has the necessary columns (idempotent)
ALTER TABLE public.trading_tokens 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure is_active is true by default for trading_tokens
ALTER TABLE public.trading_tokens 
ALTER COLUMN is_active SET DEFAULT true;

-- Ensure meme_coins has the necessary columns (just in case)
ALTER TABLE public.meme_coins 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;
