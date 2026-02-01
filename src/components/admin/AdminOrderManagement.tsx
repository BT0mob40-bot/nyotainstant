import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Coins, Phone, DollarSign, RefreshCcw } from 'lucide-react';

interface PaymentRequest {
  id: string;
  user_id: string;
  token_id: string;
  amount: number;
  phone_number: string;
  status: string;
  mpesa_receipt_number: string | null;
  checkout_request_id: string | null;
  released: boolean;
  created_at: string;
  profiles?: { email: string } | null;
  meme_coins?: { token_name: string; token_symbol: string; current_price: number } | null;
}

interface MemeCoin {
  id: string;
  token_name: string;
  token_symbol: string;
  current_price: number;
}

export function AdminOrderManagement() {
  const [orders, setOrders] = useState<PaymentRequest[]>([]);
  const [coins, setCoins] = useState<MemeCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PaymentRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [selectedCoin, setSelectedCoin] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchCoins();

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_requests' }, fetchOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        profiles!payment_requests_user_id_fkey (email),
        meme_coins!payment_requests_token_id_fkey (token_name, token_symbol, current_price)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data as any || []);
    }
    setLoading(false);
  };

  const fetchCoins = async () => {
    const { data } = await supabase
      .from('meme_coins')
      .select('id, token_name, token_symbol, current_price')
      .eq('is_active', true);
    setCoins(data || []);
  };

  const handleAllocate = async () => {
    if (!selectedOrder || !allocateAmount || !selectedCoin) {
      toast.error('Please select a coin and enter amount');
      return;
    }

    setProcessing(true);
    try {
      const amount = parseFloat(allocateAmount);
      const coin = coins.find(c => c.id === selectedCoin);
      
      if (!coin) throw new Error('Coin not found');

      // Check if user already has holdings
      const { data: existingHolder } = await supabase
        .from('meme_coin_holders')
        .select('*')
        .eq('meme_coin_id', selectedCoin)
        .eq('user_id', selectedOrder.user_id)
        .single();

      if (existingHolder) {
        // Update existing holder
        await supabase
          .from('meme_coin_holders')
          .update({
            token_balance: parseFloat(existingHolder.token_balance as any) + amount,
            total_bought: parseFloat(existingHolder.total_bought as any) + amount,
          })
          .eq('id', existingHolder.id);
      } else {
        // Create new holder record
        await supabase
          .from('meme_coin_holders')
          .insert({
            meme_coin_id: selectedCoin,
            user_id: selectedOrder.user_id,
            wallet_address: `admin_allocated_${selectedOrder.phone_number}`,
            token_balance: amount,
            total_bought: amount,
          });

        // Increment holder count
        const { data: coinData } = await supabase
          .from('meme_coins')
          .select('holder_count')
          .eq('id', selectedCoin)
          .single();

        if (coinData) {
          await supabase
            .from('meme_coins')
            .update({ holder_count: coinData.holder_count + 1 })
            .eq('id', selectedCoin);
        }
      }

      // Create trade record
      await supabase
        .from('meme_coin_trades')
        .insert({
          meme_coin_id: selectedCoin,
          user_id: selectedOrder.user_id,
          trade_type: 'buy',
          token_amount: amount,
          sol_amount: selectedOrder.amount,
          price_per_token: coin.current_price,
          tx_signature: `admin_alloc_${selectedOrder.id}_${Date.now()}`,
          status: 'confirmed',
          payment_method: 'mpesa',
          payment_request_id: selectedOrder.id,
        });

      // Mark order as released
      await supabase
        .from('payment_requests')
        .update({
          released: true,
          released_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);

      toast.success(`Allocated ${amount} ${coin.token_symbol} tokens successfully!`);
      setDialogOpen(false);
      setAllocateAmount('');
      setSelectedCoin('');
      fetchOrders();
    } catch (error: any) {
      console.error('Error allocating tokens:', error);
      toast.error(error.message || 'Failed to allocate tokens');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string, released: boolean) => {
    if (released) {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Allocated</Badge>;
    }
    
    switch (status) {
      case 'completed':
        return <Badge className="bg-amber-500"><Clock className="h-3 w-3 mr-1" />Pending Allocation</Badge>;
      case 'processing':
        return <Badge variant="secondary"><RefreshCcw className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'completed' && !o.released);
  const completedOrders = orders.filter(o => o.released);
  const otherOrders = orders.filter(o => o.status !== 'completed' || (o.status === 'completed' && o.released));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order Management</h2>
          <p className="text-muted-foreground">View payments and allocate tokens to users</p>
        </div>
        <Button variant="outline" onClick={fetchOrders}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
                <p className="text-sm text-muted-foreground">Pending Allocation</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedOrders.length}</p>
                <p className="text-sm text-muted-foreground">Allocated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  KES {orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Coins className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Allocations */}
      {pendingOrders.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pending Allocations
            </CardTitle>
            <CardDescription>Successful payments waiting for token allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount (KES)</TableHead>
                  <TableHead>M-Pesa Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((order) => (
                  <TableRow key={order.id} className="bg-amber-500/5">
                    <TableCell>{order.profiles?.email || 'Unknown'}</TableCell>
                    <TableCell className="font-mono">{order.phone_number}</TableCell>
                    <TableCell className="font-bold">KES {order.amount.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{order.mpesa_receipt_number || '-'}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setSelectedCoin(order.token_id);
                          setDialogOpen(true);
                        }}
                      >
                        <Coins className="h-4 w-4 mr-2" />
                        Allocate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Orders */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>Complete order history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No orders yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.profiles?.email || 'Unknown'}</TableCell>
                    <TableCell className="font-mono text-xs">{order.phone_number}</TableCell>
                    <TableCell className="font-bold">KES {order.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {order.meme_coins?.token_symbol || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status, order.released)}</TableCell>
                    <TableCell className="font-mono text-xs">{order.mpesa_receipt_number || '-'}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Tokens</DialogTitle>
            <DialogDescription>
              Allocate tokens to user for payment of KES {selectedOrder?.amount?.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">User:</span>
                <span>{selectedOrder?.profiles?.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-mono">{selectedOrder?.phone_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-bold">KES {selectedOrder?.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">M-Pesa Receipt:</span>
                <span className="font-mono">{selectedOrder?.mpesa_receipt_number || 'N/A'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Token</Label>
              <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a token" />
                </SelectTrigger>
                <SelectContent>
                  {coins.map((coin) => (
                    <SelectItem key={coin.id} value={coin.id}>
                      {coin.token_symbol} - {coin.token_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Token Amount to Allocate</Label>
              <Input
                type="number"
                value={allocateAmount}
                onChange={(e) => setAllocateAmount(e.target.value)}
                placeholder="Enter number of tokens"
              />
              {selectedCoin && allocateAmount && (
                <p className="text-sm text-muted-foreground">
                  ≈ ${(parseFloat(allocateAmount) * (coins.find(c => c.id === selectedCoin)?.current_price || 0)).toFixed(4)} USD value
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAllocate} disabled={processing}>
                {processing ? 'Allocating...' : 'Allocate Tokens'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
