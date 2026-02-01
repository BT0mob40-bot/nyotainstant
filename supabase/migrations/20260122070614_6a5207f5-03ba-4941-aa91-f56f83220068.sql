-- Add volatility and whitepaper fields to meme_coins
ALTER TABLE public.meme_coins 
ADD COLUMN IF NOT EXISTS volatility_percent numeric DEFAULT 2,
ADD COLUMN IF NOT EXISTS whitepaper_url text,
ADD COLUMN IF NOT EXISTS contract_address text,
ADD COLUMN IF NOT EXISTS audit_url text,
ADD COLUMN IF NOT EXISTS roadmap text,
ADD COLUMN IF NOT EXISTS team_info text,
ADD COLUMN IF NOT EXISTS tokenomics text,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Create price history table for realistic charts
CREATE TABLE IF NOT EXISTS public.meme_coin_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_coin_id UUID NOT NULL REFERENCES public.meme_coins(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  volume numeric DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meme_coin_price_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view price history
CREATE POLICY "Anyone can view price history"
ON public.meme_coin_price_history
FOR SELECT
USING (true);

-- Only service role can insert (via edge functions)
CREATE POLICY "Service role can manage price history"
ON public.meme_coin_price_history
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_price_history_coin_time 
ON public.meme_coin_price_history(meme_coin_id, created_at DESC);

-- Add admin update policy for meme_coins (admins can update any coin)
CREATE POLICY "Admins can update any meme coin"
ON public.meme_coins
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin insert policy for meme_coins
CREATE POLICY "Admins can create meme coins"
ON public.meme_coins
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add admin delete policy for meme_coins
CREATE POLICY "Admins can delete meme coins"
ON public.meme_coins
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin delete policy for mpesa_configurations
CREATE POLICY "Admins can delete mpesa configurations"
ON public.mpesa_configurations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for price history
ALTER PUBLICATION supabase_realtime ADD TABLE public.meme_coin_price_history;