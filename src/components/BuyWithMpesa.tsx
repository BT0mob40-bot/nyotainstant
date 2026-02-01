import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Smartphone, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BuyWithMpesaProps {
  memeCoinId: string;
  tokenSymbol: string;
  currentPrice: number;
  onSuccess?: () => void;
}

export function BuyWithMpesa({ memeCoinId, tokenSymbol, currentPrice, onSuccess }: BuyWithMpesaProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentSent, setPaymentSent] = useState(false);

  // Format phone number as user types
  const handlePhoneChange = (value: string) => {
    // Remove any non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '');
    setPhoneNumber(cleaned);
  };

  // Validate phone number - accept multiple formats
  const isValidPhone = (phone: string): boolean => {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s\-]/g, '');
    
    // Valid formats: 0712345678, 07xxxxxxxx, 01xxxxxxxx, 254xxxxxxxx, +254xxxxxxxx
    const patterns = [
      /^0[71]\d{8}$/, // 0712345678 or 0112345678
      /^254[71]\d{8}$/, // 254712345678
      /^\+254[71]\d{8}$/, // +254712345678
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
  };

  const handleBuyWithMpesa = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please login to buy tokens',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!isValidPhone(phoneNumber)) {
      toast({
        title: 'Invalid phone number',
        description: 'Enter a valid Safaricom number (e.g., 0712345678 or 0112345678)',
        variant: 'destructive',
      });
      return;
    }

    // Validate amount
    const amountValue = parseFloat(amount);
    if (!amount || amountValue <= 0 || amountValue < 1500) {
      toast({
        title: 'Invalid amount',
        description: 'Minimum amount is 1500 KES',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setPaymentSent(false);

    try {
      // Ensure we attach current access token explicitly (helps when gateway verifies JWT)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = (sessionData as any)?.session?.access_token;
      console.debug('mpesa: access token present', !!accessToken);

      // Initiate M-Pesa STK push
      const extraHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) extraHeaders.Authorization = `Bearer ${accessToken}`;
      if (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) extraHeaders.apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Call function endpoint directly to ensure custom headers are forwarded
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-stk-push`;
      const resp = await fetch(fnUrl, {
        method: 'POST',
        credentials: 'include',
        headers: extraHeaders,
        body: JSON.stringify({ phone_number: phoneNumber, amount: parseFloat(amount), token_id: memeCoinId }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        const msg = errBody?.error || errBody?.message || `Function returned ${resp.status}`;
        throw new Error(msg);
      }

      const respData = await resp.json();
      if (respData?.error) throw new Error(respData.error);

      setPaymentSent(true);
      toast({
        title: 'M-Pesa prompt sent! 📱',
        description: 'Check your phone and enter your M-Pesa PIN to complete payment',
      });
      
      if (onSuccess) onSuccess();

      // Don't clear fields so user can retry if needed
    } catch (error: any) {
      console.error('M-Pesa error:', error);
      // Improve messaging for authorization failures
      if (error.status === 401 || (error.message && error.message.toLowerCase().includes('unauthor'))) {
        toast({
          title: 'Unauthorized',
          description: 'Session invalid or expired — please sign out and sign in again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Payment failed',
          description: error.message || 'Failed to initiate M-Pesa payment. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const estimatedTokens = amount ? (parseFloat(amount) / currentPrice).toFixed(2) : '0';

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Buy with M-Pesa</CardTitle>
            <CardDescription>
              Instant purchase via STK Push
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentSent ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              </div>
              <h3 className="font-semibold text-lg">Waiting for Confirmation</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-[250px]">
                Please check your phone and enter your M-Pesa PIN to complete the transaction of <span className="font-bold text-foreground">{amount} KES</span>.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                <Smartphone className="w-3 h-3" />
                <span>Prompt sent to {phoneNumber}</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setPaymentSent(false)}
              className="w-full"
            >
              Cancel / Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">Safaricom Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0712345678 or 0112345678"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                disabled={loading}
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Enter your number starting with 07 or 01
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                step="1"
                min="1500"
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">Minimum 1500 KES</p>
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">You will receive:</span>
                  <span className="font-bold text-lg text-primary">
                    ~{estimatedTokens} {tokenSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Price:</span>
                  <span>{currentPrice.toFixed(6)} KES/token</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleBuyWithMpesa}
              disabled={loading || !phoneNumber || !amount || parseFloat(amount) < 1500}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending STK Push...
                </>
              ) : (
                <>
                  <Smartphone className="w-5 h-5 mr-2" />
                  Pay with M-Pesa
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll receive a prompt on your phone. Enter your M-Pesa PIN to confirm.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
