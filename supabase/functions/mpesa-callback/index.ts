import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const callback = await req.json();
    console.log('M-Pesa callback received:', JSON.stringify(callback, null, 2));

    const { Body } = callback;
    const { stkCallback } = Body;

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;

    // Find payment request
    const { data: paymentRequest, error: findError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single();

    if (findError || !paymentRequest) {
      console.error('Payment request not found:', findError);
      return new Response(
        JSON.stringify({ error: 'Payment request not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Update payment status based on result code
    let status = 'failed';
    let mpesaReceiptNumber = null;

    if (resultCode === 0) {
      status = 'completed';
      // Extract M-Pesa receipt number from callback metadata
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      const receiptItem = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber');
      mpesaReceiptNumber = receiptItem?.Value || null;
    }

    // Update payment request
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        status,
        mpesa_receipt_number: mpesaReceiptNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRequest.id);

    if (updateError) {
      console.error('Error updating payment request:', updateError);
    }

    // If payment successful, process based on type
    if (status === 'completed') {
      const amount = parseFloat(paymentRequest.amount as any);

      // Check if this is a fiat deposit (token_id is 'options_deposit' or similar)
      const isFiatDeposit = !paymentRequest.token_id ||
        paymentRequest.token_id === 'options_deposit' ||
        paymentRequest.token_id === 'fiat_deposit' ||
        paymentRequest.token_id === 'deposit' ||
        paymentRequest.token_id === 'grant_unlock';

      if (isFiatDeposit) {
        console.log(`Processing fiat deposit of KES ${amount} for user ${paymentRequest.user_id}`);

        // Create fiat transaction record (auto-approved for M-Pesa)
        const { data: fiatTx, error: fiatTxError } = await supabase
          .from('fiat_transactions')
          .insert({
            user_id: paymentRequest.user_id,
            amount: amount,
            type: 'deposit',
            status: 'approved', // Auto-approve M-Pesa deposits
            reference: mpesaReceiptNumber || checkoutRequestId,
            description: `M-Pesa deposit via ${paymentRequest.phone_number}`,
            approved_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (fiatTxError) {
          console.error('Error creating fiat transaction:', fiatTxError);
        } else {
          // Directly update user balance (trigger will also handle this, but being explicit)
          const { error: balanceError } = await supabase
            .from('profiles')
            .update({
              balance: supabase.raw(`balance + ${amount}`),
            })
            .eq('id', paymentRequest.user_id);

          if (balanceError) {
            console.error('Error updating balance:', balanceError);
          } else {
            console.log(`Successfully credited KES ${amount} to user ${paymentRequest.user_id}`);
          }

          // Check if this is a grant unlock deposit
          if (paymentRequest.token_id === 'grant_unlock' && amount >= 1500) {
            console.log('Processing grant unlock...');

            // Get user's grant record
            const { data: userGrant, error: grantFetchError } = await supabase
              .from('user_grants')
              .select('*')
              .eq('user_id', paymentRequest.user_id)
              .single();

            if (!grantFetchError && userGrant && userGrant.grant_status === 'unlocking') {
              // Update grant status to unlocked and claimed
              const { error: grantUpdateError } = await supabase
                .from('user_grants')
                .update({
                  grant_status: 'claimed',
                  unlock_payment_request_id: paymentRequest.id,
                  unlocked_at: new Date().toISOString(),
                  claimed_at: new Date().toISOString(),
                })
                .eq('id', userGrant.id);

              if (!grantUpdateError) {
                // Credit the grant amount to user's balance
                const grantAmount = userGrant.grant_amount || 20000;
                const { error: grantBalanceError } = await supabase
                  .from('profiles')
                  .update({
                    balance: supabase.raw(`balance + ${grantAmount}`),
                  })
                  .eq('id', paymentRequest.user_id);

                if (!grantBalanceError) {
                  console.log(`Grant unlocked! Credited KES ${grantAmount} to user ${paymentRequest.user_id}`);

                  // Create a transaction record for the grant
                  await supabase
                    .from('fiat_transactions')
                    .insert({
                      user_id: paymentRequest.user_id,
                      amount: grantAmount,
                      type: 'deposit',
                      status: 'approved',
                      reference: `GRANT_${userGrant.id}`,
                      description: `Welcome Grant - KES ${grantAmount}`,
                      approved_at: new Date().toISOString(),
                    });
                } else {
                  console.error('Error crediting grant balance:', grantBalanceError);
                }
              } else {
                console.error('Error updating grant status:', grantUpdateError);
              }
            } else {
              console.log('Grant not found or not in unlocking status');
            }
          }
        }
      } else {
        // This is a token purchase
        console.log(`Processing token purchase for token ${paymentRequest.token_id}`);

        // Get meme coin details
        const { data: memeCoin } = await supabase
          .from('meme_coins')
          .select('*')
          .eq('id', paymentRequest.token_id)
          .single();

        if (memeCoin) {
          // Calculate tokens (amount in KES / current price)
          const tokenAmount = Math.floor(amount / parseFloat(memeCoin.current_price as any));

          console.log(`Calculated ${tokenAmount} tokens at price ${memeCoin.current_price}`);

          // Check if user already has holdings
          const { data: existingHolder } = await supabase
            .from('meme_coin_holders')
            .select('*')
            .eq('meme_coin_id', paymentRequest.token_id)
            .eq('user_id', paymentRequest.user_id)
            .single();

          if (existingHolder) {
            // Update existing holder
            await supabase
              .from('meme_coin_holders')
              .update({
                token_balance: parseFloat(existingHolder.token_balance) + tokenAmount,
                total_bought: parseFloat(existingHolder.total_bought) + tokenAmount,
              })
              .eq('id', existingHolder.id);

            console.log(`Updated existing holder with ${tokenAmount} tokens`);
          } else {
            // Create new holder record
            await supabase
              .from('meme_coin_holders')
              .insert({
                meme_coin_id: paymentRequest.token_id,
                user_id: paymentRequest.user_id,
                wallet_address: `mpesa_${paymentRequest.phone_number}`,
                token_balance: tokenAmount,
                total_bought: tokenAmount,
              });

            // Increment holder count
            await supabase
              .from('meme_coins')
              .update({
                holder_count: memeCoin.holder_count + 1,
              })
              .eq('id', paymentRequest.token_id);

            console.log(`Created new holder with ${tokenAmount} tokens`);
          }

          // Create trade record
          await supabase
            .from('meme_coin_trades')
            .insert({
              meme_coin_id: paymentRequest.token_id,
              user_id: paymentRequest.user_id,
              trade_type: 'buy',
              token_amount: tokenAmount,
              sol_amount: amount,
              price_per_token: parseFloat(memeCoin.current_price as any),
              tx_signature: mpesaReceiptNumber || `mpesa_${checkoutRequestId}`,
              status: 'confirmed',
              payment_method: 'mpesa',
              payment_request_id: paymentRequest.id,
            });

          console.log(`Credited ${tokenAmount} tokens to user ${paymentRequest.user_id}`);

          // Update portfolio value (trigger will handle this automatically)
          console.log('Portfolio value will be updated by trigger');
        } else {
          console.error(`Token ${paymentRequest.token_id} not found`);
        }
      }
    }

    console.log(`Payment ${checkoutRequestId} status updated to ${status}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Callback processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Callback error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
