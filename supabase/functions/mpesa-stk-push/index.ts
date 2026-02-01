import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

function getCorsHeaders(origin: string | null) {
  const allowOrigin = origin || Deno.env.get('SUPABASE_URL') || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface STKPushRequest {
  phone_number: string;
  amount: number;
  token_id: string;
  destination_address?: string;
  destination_network?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(origin) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace(/Bearer\s+/i, '').trim();
    if (!token) {
      console.error('Empty token in Authorization header');
      return new Response(JSON.stringify({ error: 'Invalid Authorization header' }), { status: 401, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Invalid or expired token', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized - invalid or expired token' }), { status: 401, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } });
    }

    const { phone_number, amount, token_id, destination_address, destination_network }: STKPushRequest = await req.json();

    // Validate inputs
    if (!phone_number || !amount || !token_id) {
      throw new Error('Missing required fields: phone_number, amount, token_id');
    }

    // Check if this is an options deposit or token purchase
    const isOptionsDeposit = token_id === 'options_deposit' || token_id === 'fiat_deposit' || token_id === 'deposit' || token_id === 'grant_unlock';

    // Different minimum amounts for options deposits vs token purchases
    if (isOptionsDeposit) {
      if (amount < 500) {
        throw new Error('Minimum deposit amount is 500 KES');
      }
    } else {
      if (amount < 1500) {
        throw new Error('Minimum token purchase amount is 1500 KES');
      }
    }

    // Get active M-Pesa configuration
    const { data: config, error: configError } = await supabase
      .from('mpesa_configurations')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('Config error:', configError);
      throw new Error('M-Pesa configuration not found. Please contact admin to set up payment gateway.');
    }

    console.log('Using M-Pesa config:', { shortcode: config.shortcode });

    // Determine API base URL using is_production flag
    const apiBaseUrl = config.is_production ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

    // Get OAuth token from Safaricom
    const auth = btoa(`${config.consumer_key}:${config.consumer_secret}`);
    console.log('Requesting OAuth token...');

    const tokenResponse = await fetch(
      `${apiBaseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    const tokenResult = await tokenResponse.json();
    console.log('OAuth response status:', tokenResponse.status);

    if (!tokenResult.access_token) {
      console.error('OAuth error:', tokenResult);
      throw new Error('Failed to get M-Pesa access token. Check your Consumer Key and Secret.');
    }

    const access_token = tokenResult.access_token;

    // Format phone number - handle multiple formats:
    // 0712345678, 07xxxxxxxx, 01xxxxxxxx, 254xxxxxxxx, +254xxxxxxxx
    let formattedPhone = phone_number.toString().trim();

    // Remove any spaces, dashes, or special characters
    formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');

    // Remove leading + if present
    formattedPhone = formattedPhone.replace(/^\+/, '');

    // Handle different Kenyan phone number formats
    if (formattedPhone.startsWith('07') || formattedPhone.startsWith('01')) {
      // Convert 07xxxxxxxx or 01xxxxxxxx to 2547xxxxxxxx or 2541xxxxxxxx
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
      // Convert 7xxxxxxxx or 1xxxxxxxx to 2547xxxxxxxx or 2541xxxxxxxx  
      formattedPhone = '254' + formattedPhone;
    } else if (!formattedPhone.startsWith('254')) {
      // If doesn't start with 254, prepend it
      formattedPhone = '254' + formattedPhone.replace(/^0+/, '');
    }

    // Validate final format (should be 254 followed by 9 digits)
    if (!/^254[0-9]{9}$/.test(formattedPhone)) {
      throw new Error(`Invalid phone number format: ${phone_number}. Expected Kenyan number like 0712345678, 0112345678, or 254712345678`);
    }

    console.log('Formatted phone:', formattedPhone);

    // Generate timestamp (format: YYYYMMDDHHmmss)
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    // Generate password: Base64(Shortcode + Passkey + Timestamp)
    const password = btoa(`${config.shortcode}${config.passkey}${timestamp}`);

    // Determine Transaction Type and PartyB based on configuration
    let transactionType = 'CustomerPayBillOnline';
    let partyB = config.shortcode;

    // Use specific payment type if defined
    if (config.payment_type === 'till' || config.payment_type === 'buy_goods') {
      transactionType = 'CustomerBuyGoodsOnline';
      // For Till, PartyB is the Till Number. If till_number is missing, fallback to shortcode
      partyB = config.till_number || config.shortcode;
      console.log('Using Till Number:', partyB);
    } else {
      // Default to PayBill
      transactionType = 'CustomerPayBillOnline';
      // For PayBill, PartyB is the Business Shortcode (Paybill Number)
      partyB = config.paybill_number || config.shortcode;
      console.log('Using PayBill Number:', partyB);
    }

    // Fetch token name for AccountReference
    let tokenName = 'Deposit';

    if (!isOptionsDeposit) {
      const { data: tokenRow } = await supabase
        .from('trading_tokens')
        .select('name')
        .eq('id', token_id)
        .single();

      if (tokenRow) {
        tokenName = (tokenRow as any).name;
      }
    } else {
      tokenName = 'NyotaOptions';
    }

    // AccountReference is truncated to 12 chars to avoid errors
    const accountRef = tokenName.substring(0, 12);

    // Build STK Push request payload
    const stkPushData = {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: Math.ceil(amount), // Round up to nearest integer
      PartyA: formattedPhone,
      PartyB: partyB,
      PhoneNumber: formattedPhone,
      CallBackURL: `${supabaseUrl}/functions/v1/mpesa-callback`,
      AccountReference: accountRef,
      TransactionDesc: `Token purchase`,
    };

    console.log('STK Push request:', JSON.stringify(stkPushData, null, 2));

    // Send STK Push request
    const stkResponse = await fetch(
      `${apiBaseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPushData),
      }
    );

    const stkResult = await stkResponse.json();
    console.log('STK Push response:', JSON.stringify(stkResult, null, 2));

    // Check for success (ResponseCode "0" means success)
    if (stkResult.ResponseCode === '0') {
      // Create payment request record
      const { data: paymentRequest, error: insertError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user.id,
          token_id,
          amount,
          phone_number: formattedPhone,
          checkout_request_id: stkResult.CheckoutRequestID,
          merchant_request_id: stkResult.MerchantRequestID,
          status: 'processing',
          destination_address: destination_address || null,
          destination_network: destination_network || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error saving payment request:', insertError);
        throw insertError;
      }

      console.log('Payment request created:', paymentRequest.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'STK push sent successfully. Check your phone.',
          checkout_request_id: stkResult.CheckoutRequestID,
          merchant_request_id: stkResult.MerchantRequestID,
          payment_request_id: paymentRequest.id,
        }),
        { headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    } else {
      // Handle specific error codes
      let errorMessage = stkResult.ResponseDescription || stkResult.errorMessage || 'STK push failed';

      if (stkResult.errorCode === '404.001.03') {
        errorMessage = 'Invalid access token. Please check M-Pesa configuration.';
      } else if (stkResult.errorCode === '404.001.04') {
        errorMessage = 'Invalid shortcode. Please verify your Business Shortcode.';
      } else if (stkResult.errorCode === '500.001.1001') {
        errorMessage = 'Unable to send STK push. The phone may be unreachable.';
      }

      console.error('STK Push failed:', stkResult);
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error('Error in mpesa-stk-push:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Payment initiation failed',
        details: 'Check server logs for more information'
      }),
      {
        status: 400,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      }
    );
  }
});
