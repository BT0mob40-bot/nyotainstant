-- Create trading tokens table
CREATE TABLE public.trading_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL UNIQUE,
  token_symbol TEXT NOT NULL,
  token_name TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trading strategies table
CREATE TABLE public.trading_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token_id UUID NOT NULL REFERENCES public.trading_tokens(id) ON DELETE CASCADE,
  strategy_type TEXT NOT NULL, -- 'frequency', 'momentum', 'scalping'
  buy_threshold DECIMAL(10, 2) DEFAULT 0,
  sell_threshold DECIMAL(10, 2) DEFAULT 0,
  max_investment DECIMAL(18, 8) DEFAULT 0,
  stop_loss DECIMAL(10, 2) DEFAULT 0,
  take_profit DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trades history table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  strategy_id UUID REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
  token_id UUID NOT NULL REFERENCES public.trading_tokens(id) ON DELETE CASCADE,
  trade_type TEXT NOT NULL, -- 'buy' or 'sell'
  amount DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  total_value DECIMAL(18, 8) NOT NULL,
  gas_fee DECIMAL(18, 8),
  tx_hash TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user trading settings table
CREATE TABLE public.user_trading_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  auto_trading_enabled BOOLEAN DEFAULT false,
  risk_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  max_daily_trades INTEGER DEFAULT 10,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trading_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trading_tokens
CREATE POLICY "Anyone can view active tokens"
  ON public.trading_tokens FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage tokens"
  ON public.trading_tokens FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for trading_strategies
CREATE POLICY "Users can view their own strategies"
  ON public.trading_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategies"
  ON public.trading_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
  ON public.trading_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
  ON public.trading_strategies FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for trades
CREATE POLICY "Users can view their own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_trading_settings
CREATE POLICY "Users can view their own settings"
  ON public.user_trading_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_trading_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_trading_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_trading_tokens_updated_at
  BEFORE UPDATE ON public.trading_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_trading_strategies_updated_at
  BEFORE UPDATE ON public.trading_strategies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_trading_settings_updated_at
  BEFORE UPDATE ON public.user_trading_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();