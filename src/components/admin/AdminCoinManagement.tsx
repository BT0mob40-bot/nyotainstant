import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, TrendingUp, Users, DollarSign, FileText, ExternalLink, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface MemeCoin {
  id: string;
  token_name: string;
  token_symbol: string;
  description: string;
  image_url: string;
  current_price: number;
  initial_price: number;
  market_cap: number;
  liquidity_raised: number;
  holder_count: number;
  total_supply: number;
  tokens_sold: number;
  graduated: boolean;
  is_active: boolean;
  volatility_percent: number;
  whitepaper_url: string;
  contract_address: string;
  audit_url: string;
  roadmap: string;
  team_info: string;
  tokenomics: string;
  twitter_url: string;
  telegram_url: string;
  website_url: string;
  is_featured: boolean;
  created_at: string;
}

const defaultCoin = {
  token_name: '',
  token_symbol: '',
  description: '',
  image_url: '',
  current_price: 0.001,
  initial_price: 0.001,
  total_supply: 1000000000,
  volatility_percent: 2,
  whitepaper_url: '',
  contract_address: '',
  audit_url: '',
  roadmap: '',
  team_info: '',
  tokenomics: '',
  twitter_url: '',
  telegram_url: '',
  website_url: '',
  is_featured: false,
  is_active: true,
};

export function AdminCoinManagement() {
  const { user } = useAuth();
  const [coins, setCoins] = useState<MemeCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoin, setEditingCoin] = useState<Partial<MemeCoin> | null>(null);
  const [formData, setFormData] = useState(defaultCoin);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCoins();

    const channel = supabase
      .channel('admin-coins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meme_coins' }, fetchCoins)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchCoins = async () => {
    const { data, error } = await supabase
      .from('meme_coins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coins:', error);
    } else {
      setCoins(data || []);
    }
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingCoin(null);
    setFormData(defaultCoin);
    setDialogOpen(true);
  };

  const handleOpenEdit = (coin: MemeCoin) => {
    setEditingCoin(coin);
    setFormData({
      token_name: coin.token_name || '',
      token_symbol: coin.token_symbol || '',
      description: coin.description || '',
      image_url: coin.image_url || '',
      current_price: coin.current_price || 0.001,
      initial_price: coin.initial_price || 0.001,
      total_supply: coin.total_supply || 1000000000,
      volatility_percent: coin.volatility_percent || 2,
      whitepaper_url: coin.whitepaper_url || '',
      contract_address: coin.contract_address || '',
      audit_url: coin.audit_url || '',
      roadmap: coin.roadmap || '',
      team_info: coin.team_info || '',
      tokenomics: coin.tokenomics || '',
      twitter_url: coin.twitter_url || '',
      telegram_url: coin.telegram_url || '',
      website_url: coin.website_url || '',
      is_featured: coin.is_featured || false,
      is_active: coin.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.token_name || !formData.token_symbol) {
      toast.error('Token name and symbol are required');
      return;
    }

    setSaving(true);
    try {
      if (editingCoin?.id) {
        // Update existing coin
        const { error } = await supabase
          .from('meme_coins')
          .update({
            token_name: formData.token_name,
            token_symbol: formData.token_symbol.toUpperCase(),
            description: formData.description,
            image_url: formData.image_url,
            current_price: formData.current_price,
            initial_price: formData.initial_price,
            total_supply: formData.total_supply,
            volatility_percent: formData.volatility_percent,
            whitepaper_url: formData.whitepaper_url,
            contract_address: formData.contract_address,
            audit_url: formData.audit_url,
            roadmap: formData.roadmap,
            team_info: formData.team_info,
            tokenomics: formData.tokenomics,
            twitter_url: formData.twitter_url,
            telegram_url: formData.telegram_url,
            website_url: formData.website_url,
            is_featured: formData.is_featured,
            is_active: formData.is_active,
            market_cap: formData.current_price * formData.total_supply,
          })
          .eq('id', editingCoin.id);

        if (error) throw error;
        toast.success('Coin updated successfully!');
      } else {
        // Create new coin
        const tokenMint = `admin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
        
        const { error } = await supabase
          .from('meme_coins')
          .insert({
            creator_id: user?.id,
            token_mint: tokenMint,
            token_name: formData.token_name,
            token_symbol: formData.token_symbol.toUpperCase(),
            description: formData.description,
            image_url: formData.image_url,
            current_price: formData.current_price,
            initial_price: formData.initial_price,
            total_supply: formData.total_supply,
            volatility_percent: formData.volatility_percent,
            whitepaper_url: formData.whitepaper_url,
            contract_address: formData.contract_address,
            audit_url: formData.audit_url,
            roadmap: formData.roadmap,
            team_info: formData.team_info,
            tokenomics: formData.tokenomics,
            twitter_url: formData.twitter_url,
            telegram_url: formData.telegram_url,
            website_url: formData.website_url,
            is_featured: formData.is_featured,
            is_active: formData.is_active,
            market_cap: formData.current_price * formData.total_supply,
            liquidity_raised: 0,
            holder_count: 0,
            tokens_sold: 0,
            graduated: false,
            bonding_curve_type: 'linear',
            graduation_threshold: 85,
          });

        if (error) throw error;
        toast.success('Coin created successfully!');
      }

      setDialogOpen(false);
      fetchCoins();
    } catch (error: any) {
      console.error('Error saving coin:', error);
      toast.error(error.message || 'Failed to save coin');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (coinId: string) => {
    if (!confirm('Are you sure you want to delete this coin?')) return;

    try {
      const { error } = await supabase
        .from('meme_coins')
        .delete()
        .eq('id', coinId);

      if (error) throw error;
      toast.success('Coin deleted successfully!');
      fetchCoins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete coin');
    }
  };

  const handleToggleActive = async (coin: MemeCoin) => {
    try {
      const { error } = await supabase
        .from('meme_coins')
        .update({ is_active: !coin.is_active })
        .eq('id', coin.id);

      if (error) throw error;
      toast.success(`Coin ${coin.is_active ? 'deactivated' : 'activated'}!`);
      fetchCoins();
    } catch (error: any) {
      toast.error('Failed to update coin status');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(4);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Coin Management</h2>
          <p className="text-muted-foreground">Create and manage meme coins</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Coin
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{coins.length}</p>
                <p className="text-sm text-muted-foreground">Total Coins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{coins.filter(c => c.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Active Coins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{coins.reduce((sum, c) => sum + c.holder_count, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Holders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{coins.filter(c => c.is_featured).length}</p>
                <p className="text-sm text-muted-foreground">Featured</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Coins</CardTitle>
          <CardDescription>Manage your meme coin listings</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading coins...</div>
          ) : coins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No coins yet. Create your first coin!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coin</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Market Cap</TableHead>
                  <TableHead>Holders</TableHead>
                  <TableHead>Volatility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coins.map((coin) => (
                  <TableRow key={coin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {coin.image_url ? (
                          <img src={coin.image_url} alt={coin.token_name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {coin.token_symbol?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{coin.token_symbol}</p>
                          <p className="text-sm text-muted-foreground">{coin.token_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">${formatNumber(coin.current_price)}</TableCell>
                    <TableCell>${formatNumber(coin.market_cap)}</TableCell>
                    <TableCell>{coin.holder_count}</TableCell>
                    <TableCell>{coin.volatility_percent || 2}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {coin.is_featured && <Badge variant="secondary">Featured</Badge>}
                        <Badge variant={coin.is_active ? 'default' : 'outline'}>
                          {coin.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(coin)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Switch 
                          checked={coin.is_active} 
                          onCheckedChange={() => handleToggleActive(coin)}
                        />
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(coin.id)}>
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoin ? 'Edit Coin' : 'Create New Coin'}</DialogTitle>
            <DialogDescription>
              {editingCoin ? 'Update the coin details below' : 'Fill in the details to create a new meme coin'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
              <TabsTrigger value="social">Social Links</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Token Name *</Label>
                  <Input
                    value={formData.token_name}
                    onChange={(e) => setFormData({ ...formData, token_name: e.target.value })}
                    placeholder="e.g., Doge Coin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Token Symbol *</Label>
                  <Input
                    value={formData.token_symbol}
                    onChange={(e) => setFormData({ ...formData, token_symbol: e.target.value.toUpperCase() })}
                    placeholder="e.g., DOGE"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your token..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
                {formData.image_url && (
                  <img src={formData.image_url} alt="Preview" className="w-20 h-20 rounded-lg object-cover mt-2" />
                )}
              </div>

              <div className="space-y-2">
                <Label>Contract Address</Label>
                <Input
                  value={formData.contract_address}
                  onChange={(e) => setFormData({ ...formData, contract_address: e.target.value })}
                  placeholder="0x..."
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label>Featured Coin</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Price (USD)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.current_price}
                    onChange={(e) => setFormData({ ...formData, current_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial Price (USD)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.initial_price}
                    onChange={(e) => setFormData({ ...formData, initial_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Total Supply</Label>
                <Input
                  type="number"
                  value={formData.total_supply}
                  onChange={(e) => setFormData({ ...formData, total_supply: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Price Volatility: {formData.volatility_percent}%</Label>
                </div>
                <Slider
                  value={[formData.volatility_percent]}
                  onValueChange={(values) => setFormData({ ...formData, volatility_percent: values[0] })}
                  min={0.5}
                  max={20}
                  step={0.5}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Controls how much the price fluctuates in real-time. Higher values = more volatile.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="docs" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Whitepaper URL</Label>
                <Input
                  value={formData.whitepaper_url}
                  onChange={(e) => setFormData({ ...formData, whitepaper_url: e.target.value })}
                  placeholder="https://example.com/whitepaper.pdf"
                />
              </div>

              <div className="space-y-2">
                <Label>Audit URL</Label>
                <Input
                  value={formData.audit_url}
                  onChange={(e) => setFormData({ ...formData, audit_url: e.target.value })}
                  placeholder="https://certik.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tokenomics</Label>
                <Textarea
                  value={formData.tokenomics}
                  onChange={(e) => setFormData({ ...formData, tokenomics: e.target.value })}
                  placeholder="Describe token distribution, vesting, etc."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Roadmap</Label>
                <Textarea
                  value={formData.roadmap}
                  onChange={(e) => setFormData({ ...formData, roadmap: e.target.value })}
                  placeholder="Describe project milestones and timeline..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Team Info</Label>
                <Textarea
                  value={formData.team_info}
                  onChange={(e) => setFormData({ ...formData, team_info: e.target.value })}
                  placeholder="Describe the team behind the project..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://yourtoken.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Twitter URL</Label>
                <Input
                  value={formData.twitter_url}
                  onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                  placeholder="https://twitter.com/yourtoken"
                />
              </div>

              <div className="space-y-2">
                <Label>Telegram URL</Label>
                <Input
                  value={formData.telegram_url}
                  onChange={(e) => setFormData({ ...formData, telegram_url: e.target.value })}
                  placeholder="https://t.me/yourtoken"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingCoin ? 'Update Coin' : 'Create Coin'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
