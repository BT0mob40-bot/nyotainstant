import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Edit, Save, X, Plus, MessageCircle, Trash2 } from 'lucide-react';
import { SUPPORTED_CHAINS } from '@/lib/chains';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TokenData {
    id: string;
    token_name: string;
    token_symbol: string;
    token_address?: string; // meme_coins might use token_mint
    token_mint?: string;
    current_price: number;
    image_url?: string;
    market_cap?: number;
    liquidity?: number;
    holder_count?: number;
    description?: string;
    twitter_url?: string;
    telegram_url?: string;
    website_url?: string;
    is_active: boolean;
    chain_id?: number;
    type: 'trading' | 'meme';
    created_at?: string;
    require_wallet_address?: boolean;
    address_networks?: string;
}

export function AdminTokenManagement() {
    const [tokens, setTokens] = useState<TokenData[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Edit state
    const [editForm, setEditForm] = useState<Partial<TokenData>>({});

    // New token form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newToken, setNewToken] = useState({
        token_name: '',
        token_symbol: '',
        token_address: '',
        chain_id: '1',
        current_price: '0',
        image_url: '',
        market_cap: '0',
        liquidity: '0',
        holder_count: '0',
        description: '',
        twitter_url: '',
        telegram_url: '',
        website_url: '',
        require_wallet_address: false,
        address_networks: ''
    });

    // Chat Management State
    const [commentDialogOpen, setCommentDialogOpen] = useState(false);
    const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
    const [tokenComments, setTokenComments] = useState<any[]>([]);
    const [chatMessage, setChatMessage] = useState('');
    const [chatUser, setChatUser] = useState(''); // For fake user name

    useEffect(() => {
        fetchTokens();
    }, []);

    useEffect(() => {
        if (commentDialogOpen && selectedTokenId) {
            fetchTokenComments(selectedTokenId);
            
            // Realtime subscription for admin comments view
            const channel = supabase
                .channel(`admin-comments-${selectedTokenId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'meme_coin_comments', filter: `meme_coin_id=eq.${selectedTokenId}` }, () => {
                    fetchTokenComments(selectedTokenId);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [commentDialogOpen, selectedTokenId]);

    const fetchTokenComments = async (tokenId: string) => {
        const { data } = await supabase
            .from('meme_coin_comments')
            .select('*')
            .eq('meme_coin_id', tokenId)
            .order('created_at', { ascending: false });
        setTokenComments(data || []);
    };

    const handleApproveComment = async (commentId: string) => {
        try {
            const { error } = await supabase
                .from('meme_coin_comments')
                .update({ is_approved: true })
                .eq('id', commentId);
            if (error) throw error;
            toast.success('Comment approved');
        } catch (error: any) {
            toast.error('Failed to approve: ' + error.message);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            const { error } = await supabase
                .from('meme_coin_comments')
                .delete()
                .eq('id', commentId);
            if (error) throw error;
            toast.success('Comment deleted');
        } catch (error: any) {
            toast.error('Failed to delete: ' + error.message);
        }
    };

    const handleAddChat = async () => {
        if (!selectedTokenId || !chatMessage.trim()) return;

        try {
            // Get current user for user_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('You must be logged in');
                return;
            }

            const { error } = await supabase
                .from('meme_coin_comments')
                .insert({
                    meme_coin_id: selectedTokenId,
                    user_id: user.id,
                    comment: chatMessage.trim(),
                    user_name: chatUser.trim() || 'Admin', // If empty, default to Admin? Or maybe keep it null if regular admin post.
                    is_approved: true, // Admin posts are auto-approved
                    is_admin_post: true
                });

            if (error) throw error;

            setChatMessage('');
            setChatUser('');
            toast.success('Chat added successfully');
        } catch (error: any) {
            console.error('Error adding chat:', error);
            toast.error('Failed to add chat');
        }
    };

    const fetchTokens = async () => {
        try {
            const [tradingResult, memeResult] = await Promise.all([
                supabase.from('trading_tokens').select('*').order('created_at', { ascending: false }),
                supabase.from('meme_coins').select('*').order('created_at', { ascending: false })
            ]);

            if (tradingResult.error) throw tradingResult.error;
            if (memeResult.error) throw memeResult.error;

            const tradingTokens: TokenData[] = (tradingResult.data || []).map(t => ({
                ...t,
                type: 'trading'
            }));

            const memeCoins: TokenData[] = (memeResult.data || []).map(m => ({
                id: m.id,
                token_name: m.token_name,
                token_symbol: m.token_symbol,
                token_address: m.token_mint, // Map mint to address
                current_price: m.current_price || 0,
                image_url: m.image_url,
                market_cap: m.market_cap || 0,
                liquidity: m.liquidity_raised || 0, // Map liquidity_raised to liquidity
                holder_count: m.holder_count || 0,
                description: m.description,
                twitter_url: m.twitter_url,
                telegram_url: m.telegram_url,
                website_url: m.website_url,
                is_active: m.is_active,
                chain_id: 1, // Default to Solana (1) or unknown
                type: 'meme',
                created_at: m.created_at
            }));

            // Combine and sort by created_at desc
            const allTokens = [...tradingTokens, ...memeCoins].sort((a, b) => {
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return dateB - dateA;
            });

            setTokens(allTokens);
        } catch (error: any) {
            console.error('Error fetching tokens:', error);
            toast.error('Failed to load tokens');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('token-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('token-images')
                .getPublicUrl(filePath);

            setNewToken(prev => ({ ...prev, image_url: publicUrl }));
            toast.success('Image uploaded successfully');
        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
        }
    };

    const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('token-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('token-images')
                .getPublicUrl(filePath);

            setEditForm(prev => ({ ...prev, image_url: publicUrl }));
            toast.success('Image uploaded successfully');
        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
        }
    };

    const handleAddToken = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const { error } = await supabase
                .from('trading_tokens')
                .insert({
                    token_name: newToken.token_name,
                    token_symbol: newToken.token_symbol.toUpperCase(),
                    token_address: newToken.token_address,
                    chain_id: parseInt(newToken.chain_id),
                    current_price: parseFloat(newToken.current_price || '0'),
                    image_url: newToken.image_url,
                    market_cap: parseFloat(newToken.market_cap || '0'),
                    liquidity: parseFloat(newToken.liquidity || '0'),
                    holder_count: parseInt(newToken.holder_count || '0'),
                    description: newToken.description,
                    twitter_url: newToken.twitter_url,
                    telegram_url: newToken.telegram_url,
                    website_url: newToken.website_url,
                    is_active: true,
                    require_wallet_address: !!newToken.require_wallet_address,
                    address_networks: newToken.address_networks || null
                });

            if (error) throw error;

            toast.success('Token added successfully!');
            setShowAddForm(false);
            setNewToken({
                token_name: '',
                token_symbol: '',
                token_address: '',
                chain_id: '1',
                current_price: '0',
                image_url: '',
                market_cap: '0',
                liquidity: '0',
                holder_count: '0',
                description: '',
                twitter_url: '',
                telegram_url: '',
                website_url: '',
                require_wallet_address: false,
                address_networks: ''
            });
            fetchTokens();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add token');
        }
    };

    const handleEdit = (token: TokenData) => {
        setEditingId(token.id);
        setEditForm({
            current_price: token.current_price,
            market_cap: token.market_cap,
            liquidity: token.liquidity,
            holder_count: token.holder_count,
            image_url: token.image_url,
            description: token.description,
            twitter_url: token.twitter_url,
            telegram_url: token.telegram_url,
            website_url: token.website_url,
            require_wallet_address: token.require_wallet_address,
            address_networks: token.address_networks
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async (id: string) => {
        const token = tokens.find(t => t.id === id);
        if (!token) return;

        try {
            const table = token.type === 'meme' ? 'meme_coins' : 'trading_tokens';
            
            // Map fields back to table specific column names if needed
            const updates: any = {
                current_price: editForm.current_price,
                market_cap: editForm.market_cap,
                holder_count: editForm.holder_count,
                image_url: editForm.image_url,
                description: editForm.description,
                twitter_url: editForm.twitter_url,
                telegram_url: editForm.telegram_url,
                website_url: editForm.website_url,
                require_wallet_address: editForm.require_wallet_address,
                address_networks: editForm.address_networks
            };

            if (token.type === 'meme') {
                // meme_coins uses liquidity_raised instead of liquidity
                // but we might not be editing liquidity here anyway
                if (editForm.liquidity !== undefined) updates.liquidity_raised = editForm.liquidity;
            } else {
                if (editForm.liquidity !== undefined) updates.liquidity = editForm.liquidity;
            }

            const { error } = await supabase
                .from(table)
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            toast.success('Token updated successfully');
            setEditingId(null);
            fetchTokens();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update token');
        }
    };

    const handleToggleActive = async (token: TokenData) => {
        try {
            const table = token.type === 'meme' ? 'meme_coins' : 'trading_tokens';
            const { error } = await supabase
                .from(table)
                .update({ is_active: !token.is_active })
                .eq('id', token.id);

            if (error) throw error;

            toast.success(`Token ${!token.is_active ? 'activated' : 'deactivated'}`);
            fetchTokens();
        } catch (error: any) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id: string) => {
        const token = tokens.find(t => t.id === id);
        if (!token) return;

        if (!window.confirm(`Are you sure you want to delete this ${token.type} token? This action cannot be undone.`)) return;

        try {
            const table = token.type === 'meme' ? 'meme_coins' : 'trading_tokens';
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Token deleted successfully');
            fetchTokens();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to delete token';
            console.error('Error deleting token:', error);
            toast.error(message);
        }
    };

    if (loading) {
        return <div>Loading tokens...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Add Token Form */}
            {showAddForm ? (
                <Card className="border-primary/20">
                    <CardHeader>
                        <CardTitle>Add New Token</CardTitle>
                        <CardDescription>Add a new trading token with full details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddToken} className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="token_name">Token Name *</Label>
                                    <Input
                                        id="token_name"
                                        placeholder="e.g., Tether"
                                        value={newToken.token_name}
                                        onChange={(e) => setNewToken({ ...newToken, token_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="token_symbol">Token Symbol *</Label>
                                    <Input
                                        id="token_symbol"
                                        placeholder="e.g., USDT"
                                        value={newToken.token_symbol}
                                        onChange={(e) => setNewToken({ ...newToken, token_symbol: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Wallet Address Requirement */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Require Wallet Address at Purchase</Label>
                                    <Select value={newToken.require_wallet_address ? 'yes' : 'no'} onValueChange={(v) => setNewToken({ ...newToken, require_wallet_address: v === 'yes' })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="no">No</SelectItem>
                                            <SelectItem value="yes">Yes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Allowed Networks (comma-separated)</Label>
                                    <Input
                                        placeholder="e.g., ERC20, TRC20, SPL"
                                        value={newToken.address_networks}
                                        onChange={(e) => setNewToken({ ...newToken, address_networks: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="token_address">Token Address *</Label>
                                <Input
                                    id="token_address"
                                    placeholder="0x... (contract address)"
                                    value={newToken.token_address}
                                    onChange={(e) => setNewToken({ ...newToken, token_address: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Token description..."
                                    value={newToken.description}
                                    onChange={(e) => setNewToken({ ...newToken, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="twitter">Twitter URL</Label>
                                    <Input
                                        id="twitter"
                                        placeholder="https://x.com/..."
                                        value={newToken.twitter_url}
                                        onChange={(e) => setNewToken({ ...newToken, twitter_url: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telegram">Telegram URL</Label>
                                    <Input
                                        id="telegram"
                                        placeholder="https://t.me/..."
                                        value={newToken.telegram_url}
                                        onChange={(e) => setNewToken({ ...newToken, telegram_url: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website URL</Label>
                                    <Input
                                        id="website"
                                        placeholder="https://..."
                                        value={newToken.website_url}
                                        onChange={(e) => setNewToken({ ...newToken, website_url: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image_url">Token Image</Label>
                                <div className="flex gap-4 items-center">
                                    {newToken.image_url && (
                                        <img 
                                            src={newToken.image_url} 
                                            alt="Preview" 
                                            className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                                        />
                                    )}
                                    <Input
                                        id="image_url"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="chain_id">Blockchain</Label>
                                    <Select value={newToken.chain_id} onValueChange={(value) => setNewToken({ ...newToken, chain_id: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SUPPORTED_CHAINS.map((chain) => (
                                                <SelectItem key={chain.id} value={chain.id.toString()}>
                                                    {chain.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="current_price">Price (USD)</Label>
                                    <Input
                                        id="current_price"
                                        type="number"
                                        step="0.000001"
                                        placeholder="0.00"
                                        value={newToken.current_price}
                                        onChange={(e) => setNewToken({ ...newToken, current_price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="market_cap">Market Cap</Label>
                                    <Input
                                        id="market_cap"
                                        type="number"
                                        placeholder="0.00"
                                        value={newToken.market_cap}
                                        onChange={(e) => setNewToken({ ...newToken, market_cap: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="liquidity">Liquidity</Label>
                                    <Input
                                        id="liquidity"
                                        type="number"
                                        placeholder="0.00"
                                        value={newToken.liquidity}
                                        onChange={(e) => setNewToken({ ...newToken, liquidity: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="holder_count">Holders</Label>
                                <Input
                                    id="holder_count"
                                    type="number"
                                    placeholder="0"
                                    value={newToken.holder_count}
                                    onChange={(e) => setNewToken({ ...newToken, holder_count: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Token
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <Button onClick={() => setShowAddForm(true)} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Token
                </Button>
            )}

            {/* Existing Tokens Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Trading Tokens & Listings</CardTitle>
                    <CardDescription>Manage your meme coin listings and token details</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Token</TableHead>
                                <TableHead>Price (USD)</TableHead>
                                <TableHead>Market Cap</TableHead>
                                <TableHead>Holders</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tokens.map((token) => (
                                <TableRow key={token.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {editingId === token.id ? (
                                                <div className="flex flex-col gap-2">
                                                     {editForm.image_url && (
                                                        <img src={editForm.image_url} alt="Preview" className="h-8 w-8 rounded-full object-cover" />
                                                    )}
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleEditImageUpload}
                                                        className="w-48 text-xs"
                                                    />
                                                </div>
                                            ) : (
                                                token.image_url ? (
                                                    <img src={token.image_url} alt={token.token_symbol} className="h-8 w-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                                                        {token.token_symbol[0]}
                                                    </div>
                                                )
                                            )}
                                            <div>
                                                <div className="font-bold">{token.token_symbol}</div>
                                                <div className="text-xs text-muted-foreground">{token.token_name}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {editingId === token.id ? (
                                            <Input
                                                type="number"
                                                step="0.000001"
                                                value={editForm.current_price}
                                                onChange={(e) => setEditForm({ ...editForm, current_price: parseFloat(e.target.value) })}
                                                className="w-24"
                                            />
                                        ) : (
                                            `$${(token.current_price || 0).toLocaleString()}`
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === token.id ? (
                                            <Input
                                                type="number"
                                                value={editForm.market_cap}
                                                onChange={(e) => setEditForm({ ...editForm, market_cap: parseFloat(e.target.value) })}
                                                className="w-24"
                                            />
                                        ) : (
                                            `$${(token.market_cap || 0).toLocaleString()}`
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === token.id ? (
                                            <Input
                                                type="number"
                                                value={editForm.holder_count}
                                                onChange={(e) => setEditForm({ ...editForm, holder_count: parseInt(e.target.value) })}
                                                className="w-20"
                                            />
                                        ) : (
                                            (token.holder_count || 0).toLocaleString()
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{token.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => handleToggleActive(token)}
                                        >
                                            <Badge variant={token.is_active ? 'default' : 'secondary'}>
                                                {token.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {editingId === token.id ? (
                                                <>
                                                    <Button size="sm" onClick={() => handleSave(token.id)}>
                                                        <Save className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={handleCancel}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(token)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-500 hover:text-red-600"
                                                        onClick={() => handleDelete(token.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                    <Badge variant="outline" className="text-xs">
                                                        {token.require_wallet_address ? 'Address Required' : 'Address Optional'}
                                                    </Badge>
                                                    <Dialog open={commentDialogOpen && selectedTokenId === token.id} onOpenChange={(open) => {
                                                        setCommentDialogOpen(open);
                                                        if (open) setSelectedTokenId(token.id);
                                                        else setSelectedTokenId(null);
                                                    }}>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" variant="ghost" title="Manage Community">
                                                                <MessageCircle className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                            <DialogHeader>
                                                                <DialogTitle>Manage Community & Chat</DialogTitle>
                                                                <DialogDescription>
                                                                    Manage comments, approve pending posts, or add admin/fake comments.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            
                                                            <div className="space-y-6 py-4">
                                                                {/* Add Comment Section */}
                                                                <div className="space-y-4 border-b pb-4">
                                                                    <h3 className="font-medium">Add New Comment</h3>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <Label>Display Name (Optional)</Label>
                                                                            <Input
                                                                                placeholder="Leave empty for 'Admin' or enter fake name"
                                                                                value={chatUser}
                                                                                onChange={(e) => setChatUser(e.target.value)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>Message</Label>
                                                                        <Textarea
                                                                            placeholder="Type a message..."
                                                                            value={chatMessage}
                                                                            onChange={(e) => setChatMessage(e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <Button onClick={handleAddChat}>Post Comment</Button>
                                                                </div>

                                                                {/* Comments List */}
                                                                <div className="space-y-4">
                                                                    <h3 className="font-medium">Recent Comments ({tokenComments.length})</h3>
                                                                    <div className="space-y-2">
                                                                        {tokenComments.map((comment) => (
                                                                            <div key={comment.id} className="flex items-start justify-between p-3 bg-muted rounded-lg border">
                                                                                <div className="space-y-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="font-semibold text-sm">
                                                                                            {comment.user_name || 'User'}
                                                                                            {comment.is_admin_post && <span className="ml-2 text-xs bg-primary/10 text-primary px-1 rounded">Admin</span>}
                                                                                        </span>
                                                                                        <span className="text-xs text-muted-foreground">
                                                                                            {new Date(comment.created_at).toLocaleString()}
                                                                                        </span>
                                                                                        {!comment.is_approved && (
                                                                                            <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pending</Badge>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-sm">{comment.comment}</p>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {!comment.is_approved && (
                                                                                        <Button size="sm" variant="outline" className="h-8 text-green-600" onClick={() => handleApproveComment(comment.id)}>
                                                                                            Approve
                                                                                        </Button>
                                                                                    )}
                                                                                    <Button size="sm" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteComment(comment.id)}>
                                                                                        <Trash2 className="h-4 w-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
