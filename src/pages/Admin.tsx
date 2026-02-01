import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { LogOut, Coins, ShoppingCart, Users, Settings, CreditCard, Wallet, Globe, BarChart3, TrendingUp } from 'lucide-react';
import MpesaSettings from '@/components/MpesaSettings';
import { AdminCoinManagement } from '@/components/admin/AdminCoinManagement';
import { AdminOrderManagement } from '@/components/admin/AdminOrderManagement';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminSiteSettings } from '@/components/admin/AdminSiteSettings';
import { AdminBalanceManagement } from '@/components/admin/AdminBalanceManagement';
import { AdminTokenManagement } from '@/components/admin/AdminTokenManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { SUPPORTED_CHAINS, getChainName } from '@/lib/chains';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface DestinationAddress {
  id: string;
  wallet_address: string;
  chain_id: number;
  is_active: boolean;
  created_at: string;
}

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'coins';
  const { settings } = useSiteSettings();
  const [addresses, setAddresses] = useState<DestinationAddress[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [chainId, setChainId] = useState('1');
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchAddresses();
    }
  }, [user, isAdmin]);

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('destination_addresses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('destination_addresses')
        .insert({
          wallet_address: newAddress,
          chain_id: parseInt(chainId),
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Address added successfully!');
      setNewAddress('');
      setChainId('1');
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add address');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase
        .from('destination_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Address deleted successfully!');
      fetchAddresses();
    } catch (error: any) {
      toast.error('Failed to delete address');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              View Site
            </Button>
            <Button onClick={handleSignOut} variant="ghost">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <Tabs value={currentTab} onValueChange={(val) => setSearchParams({ tab: val })} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 lg:w-auto lg:inline-flex mb-6">
            <TabsTrigger value="tokens" className="gap-2">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Tokens</span>
            </TabsTrigger>
            <TabsTrigger value="coins" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Meme Coins</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="balances" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Balances</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="mpesa" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">M-Pesa</span>
            </TabsTrigger>
            <TabsTrigger value="wallets" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Wallets</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Site</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tokens">
            <AdminTokenManagement />
          </TabsContent>

          <TabsContent value="coins">
            <AdminCoinManagement />
          </TabsContent>

          <TabsContent value="orders">
            <AdminOrderManagement />
          </TabsContent>

          <TabsContent value="balances">
            <AdminBalanceManagement />
          </TabsContent>

          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="mpesa">
            <MpesaSettings />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSiteSettings />
          </TabsContent>

          <TabsContent value="wallets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Destination Address</CardTitle>
                <CardDescription>
                  Add crypto wallet addresses where funds will be automatically transferred
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAddress} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Wallet Address</Label>
                    <Input
                      id="address"
                      placeholder="0x..."
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chain">Blockchain Network</Label>
                    <Select value={chainId} onValueChange={setChainId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a blockchain" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CHAINS.map((chain) => (
                          <SelectItem key={chain.id} value={chain.id.toString()}>
                            {chain.name} ({chain.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Address
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Destination Addresses</CardTitle>
                <CardDescription>Manage configured destination addresses</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAddresses ? (
                  <p>Loading...</p>
                ) : addresses.length === 0 ? (
                  <p className="text-muted-foreground">No addresses configured yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Address</TableHead>
                        <TableHead>Chain</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addresses.map((addr) => (
                        <TableRow key={addr.id}>
                          <TableCell className="font-mono text-xs break-all max-w-xs">{addr.wallet_address}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getChainName(addr.chain_id)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={addr.is_active ? 'default' : 'secondary'}>
                              {addr.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(addr.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteAddress(addr.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
      </div>
    </div>
  );
};

export default Admin;
