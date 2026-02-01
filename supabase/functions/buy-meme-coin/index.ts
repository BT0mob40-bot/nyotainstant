import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Linear bonding curve: price = initial_price + (tokens_sold * price_increment)
const calculateBuyPrice = (initialPrice: number, tokensSold: number, tokensToBuy: number) => {
  const priceIncrement = 0.00000001; // Very small increment for smooth curve
  let totalCost = 0;
  
  for (let i = 0; i < tokensToBuy; i++) {
    const currentPrice = initialPrice + ((tokensSold + i) * priceIncrement);
    totalCost += currentPrice;
  }
  
  return {
    totalCost,
    averagePrice: totalCost / tokensToBuy,
    newPrice: initialPrice + ((tokensSold + tokensToBuy) * priceIncrement),
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
    const solAmount = parseFloat(amount);

    console.log('Buy request:', { memeCoinId, solAmount, walletAddress });

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

    // Calculate how many tokens can be bought with the SOL amount
    const initialPrice = parseFloat(memeCoin.initial_price);
    const tokensSold = parseFloat(memeCoin.tokens_sold);
    
    // Approximate token amount (simplified calculation)
    const estimatedTokens = Math.floor(solAmount / parseFloat(memeCoin.current_price));
    
    const { totalCost, averagePrice, newPrice } = calculateBuyPrice(
      initialPrice,
      tokensSold,
      estimatedTokens
    );

    if (totalCost > solAmount) {
      throw new Error('Insufficient SOL amount');
    }

    // Generate transaction signature (in production, this would be a real Solana transaction)
    const txSignature = `${Date.now()}${Math.random().toString(36).substring(7)}`;

    // Update meme coin stats
    const newTokensSold = tokensSold + estimatedTokens;
    const newLiquidityRaised = parseFloat(memeCoin.liquidity_raised) + solAmount;
    const newMarketCap = newPrice * parseFloat(memeCoin.total_supply);
    
    // Check if graduation threshold is reached
    const shouldGraduate = newLiquidityRaised >= parseFloat(memeCoin.graduation_threshold);

    const { error: updateError } = await supabase
      .from('meme_coins')
      .update({
        tokens_sold: newTokensSold,
        current_price: newPrice,
        liquidity_raised: newLiquidityRaised,
        market_cap: newMarketCap,
        graduated: shouldGraduate,
        graduated_at: shouldGraduate ? new Date().toISOString() : null,
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
        trade_type: 'buy',
        token_amount: estimatedTokens,
        sol_amount: solAmount,
        price_per_token: averagePrice,
        tx_signature: txSignature,
        status: 'confirmed',
      });

    if (tradeError) {
      console.error('Trade insert error:', tradeError);
      throw tradeError;
    }

    // Update or insert holder record
    const { data: existingHolder } = await supabase
      .from('meme_coin_holders')
      .select('*')
      .eq('meme_coin_id', memeCoinId)
      .eq('user_id', user.id)
      .single();

    if (existingHolder) {
      await supabase
        .from('meme_coin_holders')
        .update({
          token_balance: parseFloat(existingHolder.token_balance) + estimatedTokens,
          total_bought: parseFloat(existingHolder.total_bought) + estimatedTokens,
        })
        .eq('id', existingHolder.id);
    } else {
      await supabase
        .from('meme_coin_holders')
        .insert({
          meme_coin_id: memeCoinId,
          user_id: user.id,
          wallet_address: walletAddress,
          token_balance: estimatedTokens,
          total_bought: estimatedTokens,
        });
      
      // Increment holder count
      await supabase
        .from('meme_coins')
        .update({
          holder_count: memeCoin.holder_count + 1,
        })
        .eq('id', memeCoinId);
    }

    console.log('Buy completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        tokenAmount: estimatedTokens,
        txSignature,
        graduated: shouldGraduate,
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