CREATE OR REPLACE FUNCTION approve_fiat_transaction(trans_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_amount DECIMAL;
    v_type TEXT;
    v_status TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if executing user is admin
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can approve transactions';
    END IF;

    -- Get transaction details
    SELECT user_id, amount, type, status 
    INTO v_user_id, v_amount, v_type, v_status
    FROM fiat_transactions
    WHERE id = trans_id;

    -- Check if found and pending
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    IF v_status != 'pending' THEN
        RAISE EXCEPTION 'Transaction is not pending';
    END IF;

    -- Update transaction status
    UPDATE fiat_transactions 
    SET status = 'approved', updated_at = NOW()
    WHERE id = trans_id;

    -- Update user balance
    IF v_type = 'deposit' THEN
        UPDATE profiles 
        SET balance = COALESCE(balance, 0) + v_amount
        WHERE id = v_user_id;
    ELSIF v_type = 'withdrawal' THEN
        -- Assuming withdrawal deducts from balance
        -- Note: Usually withdrawal funds are locked or deducted upon request. 
        -- If we assume they are deducted here:
        UPDATE profiles 
        SET balance = COALESCE(balance, 0) - v_amount
        WHERE id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
