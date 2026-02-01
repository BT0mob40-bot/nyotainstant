import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const {
      name,
      symbol,
      description,
      imageUrl,
      twitterUrl,
      telegramUrl,
      websiteUrl,
    } = await req.json();

    console.log('Creating meme coin:', { name, symbol, creator: user.id });

    // Validation
    if (!name || !symbol || name.trim().length === 0 || symbol.trim().length === 0) {
      throw new Error('Token name and symbol are required');
    }

    if (symbol.length < 2 || symbol.length > 10) {
      throw new Error('Symbol must be between 2-10 characters');
    }

    // Generate a pseudo token mint address (in production, this would be a real Solana mint)
    const tokenMint = `${user.id.replace(/-/g, '').slice(0, 32)}${Date.now().toString(36)}`;

    // Insert meme coin into database
    const { data: memeCoin, error: insertError } = await supabase
      .from('meme_coins')
      .insert({
        creator_id: user.id,
        token_mint: tokenMint,
        token_name: name,
        token_symbol: symbol,
        description,
        image_url: imageUrl,
        twitter_url: twitterUrl,
        telegram_url: telegramUrl,
        website_url: websiteUrl,
        initial_price: 0.0001,
        current_price: 0.0001,
        tokens_sold: 0,
        total_supply: 1000000000, // 1 billion tokens
        bonding_curve_type: 'linear',
        market_cap: 0,
        liquidity_raised: 0,
        holder_count: 0,
        graduation_threshold: 85,
        graduated: false,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Meme coin created successfully:', memeCoin);

    return new Response(
      JSON.stringify({
        success: true,
        memeCoin,
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