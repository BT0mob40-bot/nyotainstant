import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Loader2, Wallet, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuySellButtonsProps {
  memeCoinId: string;
  tokenSymbol: string;
  currentPrice: number;
  userBalance?: number;
  onTradeComplete?: () => void;
}

export function BuySellButtons({ 
  memeCoinId, 
  tokenSymbol, 
  currentPrice, 
  userBalance = 0,
  onTradeComplete 
}: BuySellButtonsProps) {
  const { user } = useAuth();
  const { connected, publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();
  const navigate = useNavigate();
  
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'mpesa'>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationNetwork, setDestinationNetwork] = useState('');
  const [requireWalletAddress, setRequireWalletAddress] = useState<boolean>(false);
  const [addressNetworks, setAddressNetworks] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenMeta = async () => {
      try {
        const { data } = await supabase
          .from('trading_tokens')
          .select('require_wallet_address, address_networks')
          .eq('id', memeCoinId)
          .maybeSingle();
        if (data) {
          setRequireWalletAddress(!!(data as any).require_wallet_address);
          setAddressNetworks((data as any).address_networks || null);
        } else {
          setRequireWalletAddress(false);
          setAddressNetworks(null);
        }
      } catch {
        setRequireWalletAddress(false);
        setAddressNetworks(null);
      }
    };
    fetchTokenMeta();
  }, [memeCoinId]);

  const handleTrade = async () => {
    if (!user) {
      toast.error('Please login to trade');
      navigate('/auth');
      return;
    }

    const tradeAmount = parseFloat(amount);
    if (!tradeAmount || tradeAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (tradeType === 'sell' && tradeAmount > userBalance) {
      toast.error('Insufficient balance');
      return;
    }

    // M-Pesa payment flow
    if (tradeType === 'buy' && paymentMethod === 'mpesa') {
      const phoneRegex = /^254\d{9}$/;
      if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
        toast.error('Enter a valid Kenyan phone number (254XXXXXXXXX)');
        return;
      }

      setLoading(true);
      setAwaitingPayment(true);

      try {
        const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
          body: {
            phone_number: phoneNumber,
            amount: tradeAmount,
            token_id: memeCoinId,
            destination_address: requireWalletAddress ? destinationAddress.trim() : undefined,
            destination_network: requireWalletAddress ? (destinationNetwork.trim() || undefined) : undefined,
          },
        });

        if (error) throw error;

        toast.success('Check your phone for M-Pesa prompt! 📱', {
          description: 'Enter your PIN to complete the payment',
          duration: 10000,
        });

        // Poll for payment status
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes
        
        const checkPayment = async () => {
          const { data: paymentData } = await supabase
            .from('payment_requests')
            .select('status, released')
            .eq('checkout_request_id', data.checkout_request_id)
            .single();

          if (paymentData?.status === 'completed') {
            toast.success('Payment successful! 🎉', {
              description: 'Your tokens will be allocated shortly',
            });
            setAwaitingPayment(false);
            setAmount('');
            onTradeComplete?.();
            return true;
          } else if (paymentData?.status === 'failed') {
            toast.error('Payment failed. Please try again.');
            setAwaitingPayment(false);
            return true;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkPayment, 2000);
          } else {
            setAwaitingPayment(false);
            toast.info('Payment status unknown. Check your M-Pesa messages.');
          }
          return false;
        };

        setTimeout(checkPayment, 3000);
      } catch (error: any) {
        console.error('Payment error:', error);
        toast.error(error.message || 'Payment failed');
        setAwaitingPayment(false);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Wallet trade flow
    if (paymentMethod === 'wallet') {
      if (!connected || !walletAddress) {
        toast.error('Please connect your wallet first');
        return;
      }

      setLoading(true);
      try {
        const functionName = tradeType === 'buy' ? 'buy-meme-coin' : 'sell-meme-coin';
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: {
            memeCoinId,
            amount: tradeAmount,
            walletAddress,
          },
        });

        if (error) throw error;

        toast.success(`${tradeType === 'buy' ? 'Bought' : 'Sold'} ${tradeAmount} ${tokenSymbol}!`);
        setAmount('');
        onTradeComplete?.();
      } catch (error: any) {
        console.error('Trade error:', error);
        toast.error(error.message || 'Trade failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const estimatedTokens = amount ? (parseFloat(amount) / currentPrice).toFixed(2) : '0';
  const estimatedValue = amount ? (parseFloat(amount) * currentPrice).toFixed(4) : '0';

  return (
    <Card className="overflow-hidden">
      <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as 'buy' | 'sell')}>
        <TabsList className="grid w-full grid-cols-2 rounded-none h-14">
          <TabsTrigger 
            value="buy" 
            className={cn(
              "h-full text-lg font-bold rounded-none transition-all",
              "data-[state=active]:bg-green-500 data-[state=active]:text-white",
              "hover:bg-green-500/10"
            )}
          >
            <TrendingUp className="mr-2 h-5 w-5" />
            Buy
          </TabsTrigger>
          <TabsTrigger 
            value="sell"
            className={cn(
              "h-full text-lg font-bold rounded-none transition-all",
              "data-[state=active]:bg-red-500 data-[state=active]:text-white",
              "hover:bg-red-500/10"
            )}
          >
            <TrendingDown className="mr-2 h-5 w-5" />
            Sell
          </TabsTrigger>
        </TabsList>

        <CardContent className="p-6 space-y-4">
          {tradeType === 'buy' && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('mpesa')}
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                M-Pesa
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'wallet' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('wallet')}
                className="flex items-center gap-2"
              >
                <Wallet className="h-4 w-4" />
                Wallet
              </Button>
            </div>
          )}

          {tradeType === 'sell' && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Balance:</span>
                <span className="font-bold">{userBalance.toLocaleString()} {tokenSymbol}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{tradeType === 'buy' ? 'Amount (KES)' : `Amount (${tokenSymbol})`}</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={tradeType === 'buy' ? 'Enter KES amount' : 'Enter token amount'}
              className="text-lg h-12"
              min="0"
            />
            {tradeType === 'buy' && (
              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(preset.toString())}
                    className="flex-1"
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            )}
            {tradeType === 'sell' && (
              <div className="flex gap-2">
                {[25, 50, 75, 100].map((percent) => (
                  <Button
                    key={percent}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount((userBalance * percent / 100).toString())}
                    className="flex-1"
                  >
                    {percent}%
                  </Button>
                ))}
              </div>
            )}
          </div>

          {tradeType === 'buy' && paymentMethod === 'mpesa' && requireWalletAddress && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Destination Wallet Address</Label>
                <Input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Paste your wallet address"
                />
              </div>
              <div className="space-y-2">
                <Label>Network</Label>
                {addressNetworks ? (
                  <div className="flex flex-wrap gap-2">
                    {addressNetworks.split(',').map((n) => {
                      const v = n.trim();
                      return (
                        <Button
                          key={v}
                          type="button"
                          variant={destinationNetwork === v ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDestinationNetwork(v)}
                        >
                          {v}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <Input
                    type="text"
                    value={destinationNetwork}
                    onChange={(e) => setDestinationNetwork(e.target.value)}
                    placeholder="e.g., ERC20, TRC20, SPL"
                  />
                )}
              </div>
            </div>
          )}

          {tradeType === 'buy' && paymentMethod === 'mpesa' && (
            <div className="space-y-2">
              <Label>M-Pesa Phone Number</Label>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="254XXXXXXXXX"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter your Safaricom number in format 254XXXXXXXXX
              </p>
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {tradeType === 'buy' ? 'You will receive:' : 'You will receive:'}
              </span>
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-primary" />
                {tradeType === 'buy' ? `~${estimatedTokens} ${tokenSymbol}` : `~KES ${estimatedValue}`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Price:</span>
              <span>${currentPrice.toFixed(6)}</span>
            </div>
          </div>

          {awaitingPayment ? (
            <div className="p-4 bg-primary/10 rounded-lg text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div>
                <p className="font-semibold">Waiting for M-Pesa payment...</p>
                <p className="text-sm text-muted-foreground">Check your phone and enter your PIN</p>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleTrade}
              disabled={loading || !amount}
              className={cn(
                "w-full h-14 text-lg font-bold transition-all",
                tradeType === 'buy' 
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700" 
                  : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {tradeType === 'buy' ? 'Buy' : 'Sell'} {tokenSymbol}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}
