-- Create meme coins table
CREATE TABLE public.meme_coins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  token_mint TEXT NOT NULL UNIQUE,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  twitter_url TEXT,
  telegram_url TEXT,
  website_url TEXT,
  
  -- Bonding curve parameters
  initial_price NUMERIC NOT NULL DEFAULT 0.0001,
  current_price NUMERIC NOT NULL DEFAULT 0.0001,
  tokens_sold NUMERIC NOT NULL DEFAULT 0,
  total_supply NUMERIC NOT NULL DEFAULT 1000000000, -- 1 billion tokens
  bonding_curve_type TEXT NOT NULL DEFAULT 'linear',
  
  -- Market info
  market_cap NUMERIC NOT NULL DEFAULT 0,
  liquidity_raised NUMERIC NOT NULL DEFAULT 0,
  holder_count INTEGER NOT NULL DEFAULT 0,
  
  -- Graduation settings
  graduation_threshold NUMERIC NOT NULL DEFAULT 85, -- 85 SOL to graduate
  graduated BOOLEAN NOT NULL DEFAULT false,
  graduated_at TIMESTAMP WITH TIME ZONE,
  raydium_pool_address TEXT,
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meme coin trades table
CREATE TABLE public.meme_coin_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_coin_id UUID NOT NULL REFERENCES public.meme_coins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  
  -- Trade details
  token_amount NUMERIC NOT NULL,
  sol_amount NUMERIC NOT NULL,
  price_per_token NUMERIC NOT NULL,
  
  -- Transaction info
  tx_signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meme coin holders table
CREATE TABLE public.meme_coin_holders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_coin_id UUID NOT NULL REFERENCES public.meme_coins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  wallet_address TEXT NOT NULL,
  
  -- Balance
  token_balance NUMERIC NOT NULL DEFAULT 0,
  
  -- Stats
  total_bought NUMERIC NOT NULL DEFAULT 0,
  total_sold NUMERIC NOT NULL DEFAULT 0,
  realized_profit NUMERIC NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(meme_coin_id, user_id)
);

-- Enable RLS
ALTER TABLE public.meme_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meme_coin_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meme_coin_holders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meme_coins
CREATE POLICY "Anyone can view active meme coins"
  ON public.meme_coins FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can create meme coins"
  ON public.meme_coins FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their meme coins"
  ON public.meme_coins FOR UPDATE
  USING (auth.uid() = creator_id);

-- RLS Policies for meme_coin_trades
CREATE POLICY "Users can view all trades"
  ON public.meme_coin_trades FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own trades"
  ON public.meme_coin_trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for meme_coin_holders
CREATE POLICY "Anyone can view holder info"
  ON public.meme_coin_holders FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own holder records"
  ON public.meme_coin_holders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holder records"
  ON public.meme_coin_holders FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_meme_coins_creator ON public.meme_coins(creator_id);
CREATE INDEX idx_meme_coins_graduated ON public.meme_coins(graduated);
CREATE INDEX idx_meme_coins_created_at ON public.meme_coins(created_at DESC);
CREATE INDEX idx_meme_coin_trades_coin ON public.meme_coin_trades(meme_coin_id);
CREATE INDEX idx_meme_coin_trades_user ON public.meme_coin_trades(user_id);
CREATE INDEX idx_meme_coin_holders_coin ON public.meme_coin_holders(meme_coin_id);

-- Trigger for updated_at
CREATE TRIGGER update_meme_coins_updated_at
  BEFORE UPDATE ON public.meme_coins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_meme_coin_holders_updated_at
  BEFORE UPDATE ON public.meme_coin_holders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meme_coins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meme_coin_trades;