import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface PaymentRequest {
  id: string;
  amount: number;
  phone_number: string;
  status: string;
  mpesa_receipt_number: string | null;
  released: boolean;
  created_at: string;
  user_id: string;
  token_id: string;
  profiles: {
    email: string;
  };
  trading_tokens: {
    token_name: string;
    token_symbol: string;
  };
}

const AdminPaymentApprovals = () => {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('payment-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_requests'
        },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        profiles!payment_requests_user_id_fkey (email),
        trading_tokens!payment_requests_token_id_fkey (token_name, token_symbol)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
    } else {
      setPayments(data as any || []);
    }
  };

  const handleRelease = async () => {
    if (!selectedPayment || !cryptoAmount) {
      toast.error('Please enter crypto amount');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('admin-release-payment', {
        body: {
          payment_request_id: selectedPayment.id,
          crypto_amount: parseFloat(cryptoAmount),
        },
      });

      if (error) throw error;

      toast.success('Payment released successfully!');
      setDialogOpen(false);
      setSelectedPayment(null);
      setCryptoAmount('');
      fetchPayments();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to release payment');
    } finally {
      setLoading(false);
    }
  };

  const openReleaseDialog = (payment: PaymentRequest) => {
    setSelectedPayment(payment);
    setCryptoAmount('');
    setDialogOpen(true);
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

  const pendingPayments = payments.filter(p => p.status === 'completed' && !p.released);
  const recentPayments = payments.slice(0, 20);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            {pendingPayments.length} payment(s) awaiting approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingPayments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending approvals</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Amount (KES)</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">{payment.profiles.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.trading_tokens.token_symbol}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.amount}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.mpesa_receipt_number}</TableCell>
                    <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => openReleaseDialog(payment)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Release
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Payment Requests</CardTitle>
          <CardDescription>Recent payment requests from all users</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No payment requests yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">{payment.profiles.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.trading_tokens.token_symbol}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.amount} KES</TableCell>
                    <TableCell className="font-mono text-xs">{payment.mpesa_receipt_number || '-'}</TableCell>
                    <TableCell>{getStatusBadge(payment.status, payment.released)}</TableCell>
                    <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
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
            <DialogTitle>Release Payment</DialogTitle>
            <DialogDescription>
              Release crypto to user's account
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm"><strong>User:</strong> {selectedPayment.profiles.email}</p>
                <p className="text-sm"><strong>Amount Paid:</strong> {selectedPayment.amount} KES</p>
                <p className="text-sm"><strong>Token:</strong> {selectedPayment.trading_tokens.token_name}</p>
                <p className="text-sm"><strong>M-Pesa Receipt:</strong> {selectedPayment.mpesa_receipt_number}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cryptoAmount">Crypto Amount to Release</Label>
                <Input
                  id="cryptoAmount"
                  type="number"
                  step="0.00000001"
                  placeholder="0.001"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the amount of {selectedPayment.trading_tokens.token_symbol} to credit
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRelease} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Release Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentApprovals;
