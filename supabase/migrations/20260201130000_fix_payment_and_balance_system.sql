-- Comprehensive Fix for Payment, Options, and Withdrawal System
-- This migration fixes foreign key constraints, adds missing columns, and implements withdrawal logic

-- 0. Fix payment_requests and crypto_transactions schema
ALTER TABLE IF EXISTS public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_token_id_fkey;
ALTER TABLE IF EXISTS public.payment_requests ALTER COLUMN token_id SET DATA TYPE TEXT;

ALTER TABLE IF EXISTS public.crypto_transactions DROP CONSTRAINT IF EXISTS crypto_transactions_token_id_fkey;
ALTER TABLE IF EXISTS public.crypto_transactions ALTER COLUMN token_id SET DATA TYPE TEXT;

-- 1. Ensure profiles table has necessary columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS balance DECIMAL(20, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS portfolio_value DECIMAL(20, 2) DEFAULT 0.00;

-- 2. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
    ('minimum_deposit', '500', 'Minimum deposit amount in KES'),
    ('minimum_withdrawal', '100', 'Minimum withdrawal amount in KES'),
    ('grant_unlock_amount', '1500', 'Amount user must deposit to unlock welcome grant'),
    ('grant_amount', '20000', 'Welcome grant amount in KES')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 3. Fiat Transactions Table (Updated)
CREATE TABLE IF NOT EXISTS public.fiat_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    phone_number TEXT,
    reference TEXT,
    description TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Grants Table
CREATE TABLE IF NOT EXISTS public.user_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    grant_status TEXT NOT NULL DEFAULT 'locked' CHECK (grant_status IN ('locked', 'unlocking', 'unlocked', 'claimed')),
    grant_amount DECIMAL(20, 2) DEFAULT 20000.00,
    unlock_deposit_amount DECIMAL(20, 2) DEFAULT 1500.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fiat_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.fiat_transactions;
CREATE POLICY "Users can view own transactions" ON public.fiat_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can request transactions" ON public.fiat_transactions;
CREATE POLICY "Users can request transactions" ON public.fiat_transactions FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users can view own grants" ON public.user_grants;
CREATE POLICY "Users can view own grants" ON public.user_grants FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view settings" ON public.system_settings;
CREATE POLICY "Anyone can view settings" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage everything" ON public.fiat_transactions;
CREATE POLICY "Admins can manage everything" ON public.fiat_transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 6. Trigger to Process Balance on Approval
CREATE OR REPLACE FUNCTION public.handle_fiat_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        IF NEW.type = 'deposit' THEN
            UPDATE public.profiles SET balance = balance + NEW.amount WHERE id = NEW.user_id;
        ELSIF NEW.type = 'withdrawal' THEN
            -- Check balance before final approval
            IF (SELECT balance FROM public.profiles WHERE id = NEW.user_id) < NEW.amount THEN
                RAISE EXCEPTION 'User has insufficient balance';
            END IF;
            UPDATE public.profiles SET balance = balance - NEW.amount WHERE id = NEW.user_id;
        END IF;
        NEW.approved_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_handle_fiat_approval ON public.fiat_transactions;
CREATE TRIGGER tr_handle_fiat_approval
BEFORE UPDATE ON public.fiat_transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_fiat_approval();

-- 7. Backfill for existing users
INSERT INTO public.user_grants (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Policies for crypto_transactions (Trade placement)
ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can place trades" ON public.crypto_transactions;
CREATE POLICY "Users can place trades" ON public.crypto_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own trades" ON public.crypto_transactions;
CREATE POLICY "Users can view own trades" ON public.crypto_transactions FOR SELECT USING (auth.uid() = user_id);
