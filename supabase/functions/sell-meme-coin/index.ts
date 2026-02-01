import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Linear bonding curve for selling: slightly lower price than buying to account for slippage
const calculateSellPrice = (initialPrice: number, tokensSold: number, tokensToSell: number) => {
  const priceIncrement = 0.00000001;
  let totalReturn = 0;
  
  for (let i = 0; i < tokensToSell; i++) {
    const currentPrice = initialPrice + ((tokensSold - i - 1) * priceIncrement);
    totalReturn += currentPrice * 0.95; // 5% slippage on sells
  }
  
  return {
    totalReturn,
    averagePrice: totalReturn / tokensToSell,
    newPrice: initialPrice + ((tokensSold - tokensToSell) * priceIncrement),
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { memeCoinId, amount, walletAddress } = await req.json();
    const tokenAmount = parseFloat(amount);

    console.log('Sell request:', { memeCoinId, tokenAmount, walletAddress });

    // Get meme coin details
    const { data: memeCoin, error: fetchError } = await supabase
      .from('meme_coins')
      .select('*')
      .eq('id', memeCoinId)
      .single();

    if (fetchError || !memeCoin) {
      throw new Error('Meme coin not found');
    }

    if (memeCoin.graduated) {
      throw new Error('This token has graduated to Raydium. Please trade on Raydium.');
    }

    // Check holder balance
    const { data: holder, error: holderError } = await supabase
      .from('meme_coin_holders')
      .select('*')
      .eq('meme_coin_id', memeCoinId)
      .eq('user_id', user.id)
      .single();

    if (holderError || !holder) {
      throw new Error('You do not hold any tokens');
    }

    if (parseFloat(holder.token_balance) < tokenAmount) {
      throw new Error('Insufficient token balance');
    }

    // Calculate sell return
    const initialPrice = parseFloat(memeCoin.initial_price);
    const tokensSold = parseFloat(memeCoin.tokens_sold);
    
    const { totalReturn, averagePrice, newPrice } = calculateSellPrice(
      initialPrice,
      tokensSold,
      tokenAmount
    );

    // Generate transaction signature
    const txSignature = `${Date.now()}${Math.random().toString(36).substring(7)}`;

    // Update meme coin stats
    const newTokensSold = tokensSold - tokenAmount;
    const newLiquidityRaised = parseFloat(memeCoin.liquidity_raised) - totalReturn;
    const newMarketCap = newPrice * parseFloat(memeCoin.total_supply);

    const { error: updateError } = await supabase
      .from('meme_coins')
      .update({
        tokens_sold: Math.max(0, newTokensSold),
        current_price: Math.max(initialPrice, newPrice),
        liquidity_raised: Math.max(0, newLiquidityRaised),
        market_cap: newMarketCap,
      })
      .eq('id', memeCoinId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    // Insert trade record
    const { error: tradeError } = await supabase
      .from('meme_coin_trades')
      .insert({
        meme_coin_id: memeCoinId,
        user_id: user.id,
        trade_type: 'sell',
        token_amount: tokenAmount,
        sol_amount: totalReturn,
        price_per_token: averagePrice,
        tx_signature: txSignature,
        status: 'confirmed',
      });

    if (tradeError) {
      console.error('Trade insert error:', tradeError);
      throw tradeError;
    }

    // Update holder record
    const newBalance = parseFloat(holder.token_balance) - tokenAmount;
    const newTotalSold = parseFloat(holder.total_sold) + tokenAmount;
    const profit = totalReturn - (tokenAmount * parseFloat(holder.total_bought) / parseFloat(holder.token_balance));
    const newRealizedProfit = parseFloat(holder.realized_profit) + profit;

    if (newBalance <= 0) {
      // Remove holder if balance is zero
      await supabase
        .from('meme_coin_holders')
        .delete()
        .eq('id', holder.id);
      
      // Decrement holder count
      await supabase
        .from('meme_coins')
        .update({
          holder_count: Math.max(0, memeCoin.holder_count - 1),
        })
        .eq('id', memeCoinId);
    } else {
      await supabase
        .from('meme_coin_holders')
        .update({
          token_balance: newBalance,
          total_sold: newTotalSold,
          realized_profit: newRealizedProfit,
        })
        .eq('id', holder.id);
    }

    console.log('Sell completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        solAmount: totalReturn,
        txSignature,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});