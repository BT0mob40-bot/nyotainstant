import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Edit, Wallet, Search, DollarSign, CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface UserHolding {
  id: string;
  user_id: string;
  meme_coin_id: string;
  token_balance: number;
  total_bought: number;
  total_sold: number;
  realized_profit: number;
  user_email?: string;
  coin_name?: string;
  coin_symbol?: string;
}

interface MemeCoin {
  id: string;
  token_name: string;
  token_symbol: string;
}

interface FiatTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  status: 'pending' | 'approved' | 'rejected';
  reference?: string;
  created_at: string;
  user_email?: string;
}

interface UserProfile {
  id: string;
  email: string;
  balance: number;
}

export function AdminBalanceManagement() {
  // Shared state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fiat');

  // Token Holdings State
  const [holdings, setHoldings] = useState<UserHolding[]>([]);
  const [coins, setCoins] = useState<MemeCoin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<UserHolding | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [allocateUserId, setAllocateUserId] = useState('');
  const [allocateCoinId, setAllocateCoinId] = useState('');
  const [allocateAmount, setAllocateAmount] = useState('');

  // Fiat & Orders State
  const [transactions, setTransactions] = useState<FiatTransaction[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [editFiatOpen, setEditFiatOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [newFiatBalance, setNewFiatBalance] = useState('');
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'holdings') {
        await Promise.all([fetchHoldings(), fetchCoins()]);
      } else {
        await Promise.all([fetchTransactions(), fetchProfiles()]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Token Holdings Logic ---
  const fetchCoins = async () => {
    const { data } = await supabase.from('meme_coins').select('id, token_name, token_symbol').eq('is_active', true);
    if (data) setCoins(data);
  };

  const fetchHoldings = async () => {
    const { data: holdingsData, error } = await supabase
      .from('meme_coin_holders')
      .select(`*, meme_coins (token_name, token_symbol)`)
      .order('token_balance', { ascending: false });

    if (error) throw error;

    const userIds = [...new Set(holdingsData?.map(h => h.user_id) || [])];
    const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', userIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

    const enrichedHoldings = holdingsData?.map(h => ({
      ...h,
      user_email: profileMap.get(h.user_id) || h.user_id,
      coin_name: h.meme_coins?.token_name,
      coin_symbol: h.meme_coins?.token_symbol,
    })) || [];

    setHoldings(enrichedHoldings);
  };

  const handleEditBalance = (holding: UserHolding) => {
    setEditingHolding(holding);
    setNewBalance(holding.token_balance.toString());
    setDialogOpen(true);
  };

  const handleSaveBalance = async () => {
    if (!editingHolding) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('meme_coin_holders')
        .update({ token_balance: parseFloat(newBalance), updated_at: new Date().toISOString() })
        .eq('id', editingHolding.id);

      if (error) throw error;
      toast.success('Balance updated successfully!');
      setDialogOpen(false);
      fetchHoldings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update balance');
    } finally {
      setSaving(false);
    }
  };

  const handleAllocateTokens = async () => {
    if (!allocateUserId || !allocateCoinId || !allocateAmount) {
      toast.error('Please fill in all fields');
      return;
    }
    setSaving(true);
    try {
      const { data: existingHolding } = await supabase
        .from('meme_coin_holders')
        .select('*')
        .eq('user_id', allocateUserId)
        .eq('meme_coin_id', allocateCoinId)
        .single();

      if (existingHolding) {
        const { error } = await supabase
          .from('meme_coin_holders')
          .update({
            token_balance: existingHolding.token_balance + parseFloat(allocateAmount),
            total_bought: existingHolding.total_bought + parseFloat(allocateAmount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingHolding.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('meme_coin_holders').insert({
          user_id: allocateUserId,
          meme_coin_id: allocateCoinId,
          wallet_address: 'admin_allocated',
          token_balance: parseFloat(allocateAmount),
          total_bought: parseFloat(allocateAmount),
        });
        if (error) throw error;
      }
      toast.success('Tokens allocated successfully!');
      setAllocateDialogOpen(false);
      fetchHoldings();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Fiat & Orders Logic ---
  const fetchTransactions = async () => {
    const { data: txData, error } = await supabase
      .from('fiat_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching transactions", error);
        // Don't throw, just empty
        setTransactions([]);
        return;
    }

    const userIds = [...new Set(txData?.map(t => t.user_id) || [])];
    const { data: userProfiles } = await supabase.from('profiles').select('id, email').in('id', userIds);
    const profileMap = new Map(userProfiles?.map(p => [p.id, p.email]) || []);

    const enrichedTx = txData?.map(t => ({
      ...t,
      user_email: profileMap.get(t.user_id) || t.user_id,
    })) || [];

    setTransactions(enrichedTx as FiatTransaction[]);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, balance')
      .order('balance', { ascending: false });
    
    if (error) {
        console.error("Error fetching profiles", error);
        return;
    }
    
    // Some profiles might not have balance column if migration failed or cached schema
    // Assuming migration ran
    setProfiles(data?.map(p => ({ ...p, balance: p.balance || 0 })) || []);
  };

  const handleApproveOrder = async (txId: string) => {
    setProcessingOrder(txId);
    try {
      const { error } = await supabase.rpc('approve_fiat_transaction', { trans_id: txId });
      if (error) throw error;
      toast.success('Order approved and balance updated!');
      fetchTransactions();
      fetchProfiles();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to approve order');
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleRejectOrder = async (txId: string) => {
    setProcessingOrder(txId);
    try {
      const { error } = await supabase
        .from('fiat_transactions')
        .update({ status: 'rejected' })
        .eq('id', txId);
      
      if (error) throw error;
      toast.success('Order rejected');
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject order');
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleEditFiatBalance = (profile: UserProfile) => {
    setEditingProfile(profile);
    setNewFiatBalance(profile.balance.toString());
    setEditFiatOpen(true);
  };

  const handleSaveFiatBalance = async () => {
    if (!editingProfile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance: parseFloat(newFiatBalance) })
        .eq('id', editingProfile.id);
      
      if (error) throw error;
      toast.success('User balance updated!');
      setEditFiatOpen(false);
      fetchProfiles();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredHoldings = holdings.filter(h => 
    h.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.coin_symbol?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Finance & Token Management</h2>
          <p className="text-muted-foreground">Manage user fiat balances, orders, and token allocations</p>
        </div>
        {activeTab === 'holdings' && (
          <Button onClick={() => setAllocateDialogOpen(true)}>
            <Wallet className="mr-2 h-4 w-4" />
            Allocate Tokens
          </Button>
        )}
      </div>

      <Tabs defaultValue="fiat" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="fiat" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Fiat & Orders
          </TabsTrigger>
          <TabsTrigger value="holdings" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Token Holdings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fiat" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total User Funds</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {profiles.reduce((acc, curr) => acc + (curr.balance || 0), 0).toLocaleString()} KES
                    </div>
                </CardContent>
             </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                        {transactions.filter(t => t.status === 'pending' && t.type === 'deposit').length}
                    </div>
                </CardContent>
             </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-500">
                        {transactions.filter(t => t.status === 'pending' && t.type === 'withdrawal').length}
                    </div>
                </CardContent>
             </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Orders */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Pending Orders</CardTitle>
                <CardDescription>Approve or reject fiat transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.filter(t => t.status === 'pending').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No pending orders</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.filter(t => t.status === 'pending').map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="font-medium text-sm">{tx.user_email}</TableCell>
                                    <TableCell>
                                        <Badge variant={tx.type === 'deposit' ? 'default' : 'destructive'}>
                                            {tx.type === 'deposit' ? <ArrowDownLeft className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                                            {tx.type.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-bold">{tx.amount.toLocaleString()} KES</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</TableCell>
                                    <TableCell className="font-mono text-xs">{tx.reference || '-'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={() => handleApproveOrder(tx.id)} disabled={processingOrder === tx.id}>
                                                {processingOrder === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                                                Approve
                                            </Button>
                                            <Button size="sm" variant="destructive" className="h-8" onClick={() => handleRejectOrder(tx.id)} disabled={processingOrder === tx.id}>
                                                <XCircle className="w-4 h-4 mr-1" />
                                                Reject
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
              </CardContent>
            </Card>

            {/* User Balances List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>User Balances</CardTitle>
                <CardDescription>View and manually adjust user fiat balances</CardDescription>
              </CardHeader>
              <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User Email</TableHead>
                            <TableHead>Current Balance</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.map((profile) => (
                            <TableRow key={profile.id}>
                                <TableCell>{profile.email}</TableCell>
                                <TableCell className="font-mono font-bold text-lg">{profile.balance.toLocaleString()} KES</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="outline" onClick={() => handleEditFiatBalance(profile)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Adjust
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="holdings" className="space-y-4">
           {/* Existing Holdings Logic */}
           <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Token Holdings</CardTitle>
                  <CardDescription>All user token balances across coins</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or coin..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading && activeTab === 'holdings' ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : filteredHoldings.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No holdings found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Coin</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Total Bought</TableHead>
                      <TableHead>Realized P/L</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHoldings.map((holding) => (
                      <TableRow key={holding.id}>
                        <TableCell className="font-mono text-sm">{holding.user_email?.slice(0, 20)}...</TableCell>
                        <TableCell>
                          <span className="font-semibold">{holding.coin_symbol}</span>
                          <span className="text-muted-foreground text-sm ml-1">({holding.coin_name})</span>
                        </TableCell>
                        <TableCell className="font-mono font-semibold">{holding.token_balance.toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-sm">{holding.total_bought.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={holding.realized_profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {holding.realized_profit >= 0 ? '+' : ''}{holding.realized_profit.toFixed(2)} KES
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => handleEditBalance(holding)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Fiat Balance Dialog */}
      <Dialog open={editFiatOpen} onOpenChange={setEditFiatOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adjust User Balance</DialogTitle>
                <DialogDescription>Manually update fiat balance for {editingProfile?.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label>New Balance (KES)</Label>
                    <Input type="number" value={newFiatBalance} onChange={(e) => setNewFiatBalance(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditFiatOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveFiatBalance} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Existing Edit Token Balance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Token Balance</DialogTitle>
            <DialogDescription>
              Adjust the token balance for {editingHolding?.user_email} - {editingHolding?.coin_symbol}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Current Balance</Label>
              <p className="text-lg font-mono">{editingHolding?.token_balance.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label>New Balance</Label>
              <Input
                type="number"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="Enter new balance"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveBalance} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allocate Tokens Dialog */}
      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Tokens to User</DialogTitle>
            <DialogDescription>Manually allocate tokens to a user's wallet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                value={allocateUserId}
                onChange={(e) => setAllocateUserId(e.target.value)}
                placeholder="Enter user UUID"
              />
            </div>
            <div className="space-y-2">
              <Label>Select Coin</Label>
              <Select value={allocateCoinId} onValueChange={setAllocateCoinId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a coin" />
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
              <Label>Amount to Allocate</Label>
              <Input
                type="number"
                value={allocateAmount}
                onChange={(e) => setAllocateAmount(e.target.value)}
                placeholder="Enter token amount"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAllocateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAllocateTokens} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Allocate Tokens'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
