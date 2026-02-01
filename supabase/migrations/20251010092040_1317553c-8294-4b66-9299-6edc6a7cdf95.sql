-- Create enum for payment status
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- Create enum for transaction types
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'buy', 'sell', 'transfer');

-- Create mpesa_configurations table for storing Daraja credentials
CREATE TABLE public.mpesa_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('till', 'paybill')),
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  shortcode TEXT NOT NULL,
  passkey TEXT NOT NULL,
  till_number TEXT,
  paybill_number TEXT,
  account_reference TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for mpesa_configurations
ALTER TABLE public.mpesa_configurations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage mpesa configurations
CREATE POLICY "Admins can manage mpesa configurations"
ON public.mpesa_configurations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create user_balances table for internal wallet system
CREATE TABLE public.user_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES public.trading_tokens(id),
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  locked_balance NUMERIC NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, token_id)
);

-- Enable RLS for user_balances
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- Users can view their own balances
CREATE POLICY "Users can view their own balances"
ON public.user_balances
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert/update balances (handled by edge functions)
CREATE POLICY "Authenticated users can insert their own balances"
ON public.user_balances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all balances
CREATE POLICY "Admins can view all balances"
ON public.user_balances
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create payment_requests table for M-Pesa transactions
CREATE TABLE public.payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES public.trading_tokens(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  phone_number TEXT NOT NULL,
  mpesa_receipt_number TEXT,
  checkout_request_id TEXT,
  merchant_request_id TEXT,
  status payment_status DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  released BOOLEAN DEFAULT false,
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for payment_requests
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment requests
CREATE POLICY "Users can view their own payment requests"
ON public.payment_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own payment requests
CREATE POLICY "Users can create payment requests"
ON public.payment_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all payment requests
CREATE POLICY "Admins can view all payment requests"
ON public.payment_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update payment requests
CREATE POLICY "Admins can update payment requests"
ON public.payment_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create transactions table for comprehensive transaction history
CREATE TABLE public.crypto_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES public.trading_tokens(id),
  transaction_type transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  payment_request_id UUID REFERENCES public.payment_requests(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for crypto_transactions
ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.crypto_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.crypto_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger for mpesa_configurations
CREATE TRIGGER update_mpesa_configurations_updated_at
BEFORE UPDATE ON public.mpesa_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create updated_at trigger for user_balances
CREATE TRIGGER update_user_balances_updated_at
BEFORE UPDATE ON public.user_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create updated_at trigger for payment_requests
CREATE TRIGGER update_payment_requests_updated_at
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();