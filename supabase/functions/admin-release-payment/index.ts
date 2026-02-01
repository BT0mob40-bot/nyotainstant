import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReleasePaymentRequest {
  payment_request_id: string;
  crypto_amount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT and verify admin role
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Forbidden: Admin access required');
    }

    const { payment_request_id, crypto_amount }: ReleasePaymentRequest = await req.json();

    // Get payment request
    const { data: paymentRequest, error: prError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', payment_request_id)
      .single();

    if (prError || !paymentRequest) {
      throw new Error('Payment request not found');
    }

    if (paymentRequest.status !== 'completed') {
      throw new Error('Payment must be completed before release');
    }

    if (paymentRequest.released) {
      throw new Error('Payment already released');
    }

    // Get or create user balance
    const { data: existingBalance } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', paymentRequest.user_id)
      .eq('token_id', paymentRequest.token_id)
      .single();

    const currentBalance = existingBalance?.balance || 0;
    const newBalance = parseFloat(currentBalance.toString()) + crypto_amount;

    if (existingBalance) {
      // Update existing balance
      await supabase
        .from('user_balances')
        .update({ balance: newBalance })
        .eq('id', existingBalance.id);
    } else {
      // Create new balance
      await supabase
        .from('user_balances')
        .insert({
          user_id: paymentRequest.user_id,
          token_id: paymentRequest.token_id,
          balance: crypto_amount,
        });
    }

    // Record transaction
    await supabase
      .from('crypto_transactions')
      .insert({
        user_id: paymentRequest.user_id,
        token_id: paymentRequest.token_id,
        transaction_type: 'deposit',
        amount: crypto_amount,
        balance_before: currentBalance,
        balance_after: newBalance,
        payment_request_id: paymentRequest.id,
        notes: `M-Pesa deposit - Receipt: ${paymentRequest.mpesa_receipt_number}`,
      });

    // Mark payment as released
    await supabase
      .from('payment_requests')
      .update({
        released: true,
        released_at: new Date().toISOString(),
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', payment_request_id);

    console.log(`Payment ${payment_request_id} released: ${crypto_amount} tokens to user ${paymentRequest.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment released successfully',
        new_balance: newBalance,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
