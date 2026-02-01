-- Create meme coin comments table for community discussions
CREATE TABLE public.meme_coin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_coin_id UUID NOT NULL REFERENCES public.meme_coins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meme_coin_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Anyone can view comments" 
  ON public.meme_coin_comments 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create comments" 
  ON public.meme_coin_comments 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
  ON public.meme_coin_comments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
  ON public.meme_coin_comments 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_meme_coin_comments_updated_at
  BEFORE UPDATE ON public.meme_coin_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Update meme_coin_trades to support M-Pesa payment
ALTER TABLE public.meme_coin_trades 
  ADD COLUMN payment_method TEXT DEFAULT 'wallet',
  ADD COLUMN payment_request_id UUID REFERENCES public.payment_requests(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_meme_coin_comments_coin_id ON public.meme_coin_comments(meme_coin_id);
CREATE INDEX idx_meme_coin_comments_user_id ON public.meme_coin_comments(user_id);
CREATE INDEX idx_meme_coin_trades_payment_request ON public.meme_coin_trades(payment_request_id);