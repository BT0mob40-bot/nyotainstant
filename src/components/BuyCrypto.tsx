import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Token {
  id: string;
  token_name: string;
  token_symbol: string;
  chain_id: number;
  current_price?: number;
  require_wallet_address?: boolean;
  address_networks?: string | null;
}

interface PaymentRequest {
  id: string;
  amount: number;
  phone_number: string;
  status: string;
  mpesa_receipt_number: string | null;
  released: boolean;
  created_at: string;
  token_id: string;
}

const BuyCrypto = () => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationNetwork, setDestinationNetwork] = useState('');

  useEffect(() => {
    if (user) {
      fetchTokens();
      fetchPaymentRequests();
    }
  }, [user]);

  const fetchTokens = async () => {
    const { data, error } = await supabase
      .from('trading_tokens')
      .select('*')
      .eq('is_active', true)
      .order('token_name');

    if (error) {
      console.error('Error fetching tokens:', error);
    } else {
      setTokens(data || []);
    }
  };

  const fetchPaymentRequests = async () => {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching payment requests:', error);
    } else {
      setPaymentRequests(data || []);
    }
  };

  const handleBuyCrypto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedToken || !amount || !phoneNumber) {
      toast.error('Please fill in all fields');
      return;
    }
    const selectedTokenObj = tokens.find(t => t.id === selectedToken);
    if (selectedTokenObj?.require_wallet_address) {
      if (!destinationAddress.trim()) {
        toast.error('Enter your wallet address');
        return;
      }
      const networksStr = selectedTokenObj.address_networks || '';
      if (networksStr.length > 0 && !destinationNetwork.trim()) {
        toast.error('Select the network');
        return;
      }
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 1500) {
      toast.error('Minimum amount is 1500 KES');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          token_id: selectedToken,
          amount: parseFloat(amount),
          phone_number: phoneNumber,
          destination_address: selectedTokenObj?.require_wallet_address ? destinationAddress.trim() : undefined,
          destination_network: selectedTokenObj?.require_wallet_address ? (destinationNetwork.trim() || undefined) : undefined,
        },
      });

      if (error) throw error;

      toast.success('STK push sent! Please check your phone and enter M-Pesa PIN');
      setAmount('');
      setDestinationAddress('');
      setDestinationNetwork('');
      fetchPaymentRequests();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, released: boolean) => {
    if (released) {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    }

    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Awaiting Release</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="glass-strong border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <div className="h-10 w-10 rounded-lg gradient-gold flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-black" />
            </div>
            Buy Crypto with M-Pesa
          </CardTitle>
          <CardDescription className="text-base">
            Purchase cryptocurrency instantly using M-Pesa. Funds released after admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBuyCrypto} className="space-y-6">
            {/* Token Selection */}
            <div className="space-y-3">
              <Label htmlFor="token" className="text-base font-semibold">Select Cryptocurrency</Label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger className="h-12 text-base border-border/50">
                  <SelectValue placeholder="Choose a token" />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((token) => (
                    <SelectItem key={token.id} value={token.id} className="py-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold">{token.token_name} ({token.token_symbol})</span>
                        <span className="text-primary ml-4">${token.current_price?.toLocaleString() || '0.00'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedToken && tokens.find(t => t.id === selectedToken) && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Current Price:</span>{' '}
                    <span className="font-bold text-primary text-lg">
                      ${tokens.find(t => t.id === selectedToken)?.current_price?.toLocaleString() || '0.00'}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Amount Input with Quick Buttons */}
            <div className="space-y-3">
              <Label htmlFor="amount" className="text-base font-semibold">Amount (KES)</Label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[1500, 5000, 10000, 25000].map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    type="button"
                    variant={amount === quickAmount.toString() ? "default" : "outline"}
                    className={amount === quickAmount.toString() ? "gradient-gold text-black" : "border-border/50"}
                    onClick={() => setAmount(quickAmount.toString())}
                  >
                    {quickAmount}
                  </Button>
                ))}
              </div>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount in KES"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1500"
                className="h-12 text-base border-border/50"
                required
              />
              <p className="text-xs text-muted-foreground">Minimum 1500 KES</p>
              {amount && selectedToken && tokens.find(t => t.id === selectedToken)?.current_price && (
                <div className="p-4 rounded-lg glass border border-success/20">
                  <p className="text-sm text-muted-foreground mb-1">You will receive approximately:</p>
                  <p className="text-2xl font-bold text-success">
                    {(parseFloat(amount) / (tokens.find(t => t.id === selectedToken)?.current_price || 1)).toFixed(6)}{' '}
                    {tokens.find(t => t.id === selectedToken)?.token_symbol}
                  </p>
                </div>
              )}
            </div>

            {/* Optional Wallet Address + Network */}
            {selectedToken && (() => {
              const tok = tokens.find(t => t.id === selectedToken);
              if (!tok?.require_wallet_address) return null;
              return (
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Destination Wallet Address</Label>
                    <Input
                      placeholder="Paste your wallet address"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Network</Label>
                    {tok.address_networks ? (
                      <Select value={destinationNetwork} onValueChange={setDestinationNetwork}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                        <SelectContent>
                          {tok.address_networks.split(',').map((n) => {
                            const v = n.trim();
                            return (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="e.g., ERC20, TRC20, SPL"
                        value={destinationNetwork}
                        onChange={(e) => setDestinationNetwork(e.target.value)}
                      />
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Phone Number */}
            <div className="space-y-3">
              <Label htmlFor="phone" className="text-base font-semibold">M-Pesa Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="254712345678 or 0712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-12 text-base border-border/50"
                required
              />
              <p className="text-xs text-muted-foreground">
                Format: 254XXXXXXXXX (include country code)
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Buy Now
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your recent M-Pesa crypto purchases</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {paymentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{request.amount} KES</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleString()}
                    </p>
                    {request.mpesa_receipt_number && (
                      <p className="text-xs text-muted-foreground">
                        Receipt: {request.mpesa_receipt_number}
                      </p>
                    )}
                  </div>
                  <div>
                    {getStatusBadge(request.status, request.released)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyCrypto;
