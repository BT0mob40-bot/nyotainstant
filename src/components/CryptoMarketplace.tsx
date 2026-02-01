import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Loader2, ShoppingCart } from 'lucide-react';

interface Token {
    id: string;
    token_name: string;
    token_symbol: string;
    current_price?: number;
    is_active: boolean;
    image_url?: string;
    market_cap?: number;
    require_wallet_address?: boolean;
    address_networks?: string;
}

export function CryptoMarketplace() {
    const { user } = useAuth();
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [buyDialogOpen, setBuyDialogOpen] = useState(false);
    const [selectedToken, setSelectedToken] = useState<Token | null>(null);
    const [amount, setAmount] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [processing, setProcessing] = useState(false);
    const [destinationAddress, setDestinationAddress] = useState('');
    const [destinationNetwork, setDestinationNetwork] = useState('');

    useEffect(() => {
        fetchTokens();
        const interval = setInterval(fetchTokens, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchTokens = async () => {
        try {
            // Fetch Trading Tokens
            const tradingTokensQuery = supabase
                .from('trading_tokens')
                .select('*')
                .eq('is_active', true)
                .order('token_name');

            // Fetch Meme Coins
            const memeCoinsQuery = supabase
                .from('meme_coins')
                .select('*')
                .eq('is_active', true);

            const [tradingTokensResult, memeCoinsResult] = await Promise.all([
                tradingTokensQuery,
                memeCoinsQuery
            ]);

            if (tradingTokensResult.error) throw tradingTokensResult.error;
            if (memeCoinsResult.error) throw memeCoinsResult.error;

            const tradingTokens = tradingTokensResult.data || [];
            
            // Map Meme Coins to Token interface
            const memeCoins = (memeCoinsResult.data || []).map((coin: any) => ({
                id: coin.id,
                token_name: coin.token_name,
                token_symbol: coin.token_symbol,
                current_price: coin.current_price || 0,
                is_active: coin.is_active,
                image_url: coin.image_url,
                market_cap: coin.market_cap
            }));

            // Combine tokens
            const allTokens = [...tradingTokens, ...memeCoins];
            
            // Remove duplicates (if any, though IDs should be unique across tables usually)
            // But let's just use the combined list
            
            console.log('Fetched tokens:', allTokens);
            setTokens(allTokens);
        } catch (error) {
            console.error('Error fetching tokens:', error);
            toast.error('Failed to load tokens');
        } finally {
            setLoading(false);
        }
    };

    const handleBuyClick = (token: Token) => {
        setSelectedToken(token);
        setBuyDialogOpen(true);
        setAmount('');
        setPhoneNumber('');
    };

    const handleBuySubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedToken || !amount || !phoneNumber) {
            toast.error('Please fill in all fields');
            return;
        }
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt < 1500) {
            toast.error('Minimum amount is 1500 KES');
            return;
        }
        if (selectedToken.require_wallet_address) {
            if (!destinationAddress.trim()) {
                toast.error('Enter your wallet address');
                return;
            }
            if ((selectedToken.address_networks || '').length > 0 && !destinationNetwork.trim()) {
                toast.error('Select the network');
                return;
            }
        }

        setProcessing(true);

        try {
            const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
                body: {
                    token_id: selectedToken.id,
                    amount: parseFloat(amount),
                    phone_number: phoneNumber,
                    destination_address: selectedToken.require_wallet_address ? destinationAddress.trim() : undefined,
                    destination_network: selectedToken.require_wallet_address ? destinationNetwork.trim() || undefined : undefined,
                },
            });

            if (error) throw error;

            toast.success('STK push sent! Check your phone and enter M-Pesa PIN');
            setBuyDialogOpen(false);
            setAmount('');
            setPhoneNumber('');
        } catch (error: any) {
            console.error('M-Pesa error:', error);
            toast.error(error.message || 'Failed to initiate payment');
        } finally {
            setProcessing(false);
        }
    };

    const getRandomChange = () => {
        // Simulate 24h change (in production, get from database)
        const change = (Math.random() * 20 - 10).toFixed(2);
        return parseFloat(change);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4 animate-fade-in">
                {tokens.length === 0 ? (
                    <Card className="glass">
                        <CardContent className="py-12 text-center">
                            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No tokens available</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Admin needs to add tokens first
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {tokens.map((token) => {
                            const change24h = getRandomChange();
                            const isPositive = change24h >= 0;
                            const estimatedTokens = amount ? (parseFloat(amount) / (token.current_price || 1)).toFixed(6) : '0';

                            return (
                                <Link to={`/meme/${token.id}`} key={token.id} className="block group">
                                    <Card className="glass-strong border-border/50 group-hover:border-primary/30 transition-all card-hover h-full">
                                        <CardContent className="p-4 md:p-6">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                {/* Token Info */}
                                                <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                                                    {token.image_url ? (
                                                        <img src={token.image_url} alt={token.token_symbol} className="h-14 w-14 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 flex items-center justify-center ring-2 ring-white/20 shadow-lg shadow-black/30">
                                                            <span className="text-2xl font-bold text-white">
                                                                {token.token_symbol[0]}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{token.token_name}</h3>
                                                            <Badge variant="outline" className="text-xs">
                                                                {token.token_symbol}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div>
                                                                <p className="text-2xl font-bold text-gradient-gold">
                                                                    ${token.current_price?.toLocaleString() || '0.00'}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                className={`h-7 px-3 rounded-full font-semibold flex items-center gap-1 ${isPositive ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                                                                onClick={(e) => e.preventDefault()}
                                                            >
                                                                {isPositive ? (
                                                                    <TrendingUp className="h-4 w-4" />
                                                                ) : (
                                                                    <TrendingDown className="h-4 w-4" />
                                                                )}
                                                                <span>{isPositive ? '+' : ''}{change24h}%</span>
                                                                <span className="text-xs opacity-80 ml-1">24h</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="lg"
                                                        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 hover:scale-105 transition-transform"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleBuyClick(token);
                                                        }}
                                                    >
                                                        Buy
                                                    </Button>
                                                    <Button
                                                        size="lg"
                                                        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 border-none hover:scale-105 transition-transform"
                                                        disabled
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        Sell
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Buy Dialog */}
            <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
                <DialogContent className="glass-strong border-primary/20 max-h-[90vh] overflow-y-auto w-[95%] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 flex items-center justify-center ring-2 ring-white/20 shadow-lg shadow-black/30">
                                <span className="text-xl font-bold text-white">
                                    {selectedToken?.token_symbol[0]}
                                </span>
                            </div>
                            Buy {selectedToken?.token_name}
                        </DialogTitle>
                        <DialogDescription>
                            Purchase {selectedToken?.token_symbol} using M-Pesa
                        </DialogDescription>
                        <div className="mt-3">
                            {(() => {
                                const dialogChange24h = getRandomChange();
                                const dialogPositive = dialogChange24h >= 0;
                                return (
                                    <Button
                                        size="sm"
                                        className={`h-7 px-3 rounded-full font-semibold flex items-center gap-1 ${dialogPositive ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                                        onClick={(e) => e.preventDefault()}
                                    >
                                        {dialogPositive ? (
                                            <TrendingUp className="h-4 w-4" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4" />
                                        )}
                                        <span>{dialogPositive ? '+' : ''}{dialogChange24h}%</span>
                                        <span className="text-xs opacity-80 ml-1">24h change</span>
                                    </Button>
                                );
                            })()}
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleBuySubmit} className="space-y-6 mt-4">
                        {/* Current Price Display */}
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                            <p className="text-3xl font-bold text-primary">
                                ${selectedToken?.current_price?.toLocaleString() || '0.00'}
                            </p>
                        </div>

                        {/* Amount Input with Quick Buttons */}
                        <div className="space-y-3">
                            <Label htmlFor="buy-amount" className="text-base font-semibold">Amount (KES)</Label>
                            <div className="grid grid-cols-4 gap-2">
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
                                id="buy-amount"
                                type="number"
                                placeholder="Enter amount in KES"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="1500"
                                className="h-12 text-lg border-border/50"
                                required
                            />
                            <p className="text-xs text-muted-foreground">Minimum 1500 KES</p>
                            {amount && selectedToken && (
                                <div className="p-4 rounded-lg glass border border-success/20">
                                    <p className="text-sm text-muted-foreground mb-1">You will receive approximately:</p>
                                    <p className="text-2xl font-bold text-success">
                                        {(parseFloat(amount) / (selectedToken.current_price || 1)).toFixed(6)}{' '}
                                        {selectedToken.token_symbol}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Optional Wallet Address + Network */}
                        {selectedToken?.require_wallet_address && (
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Destination Wallet Address</Label>
                                <Input
                                    placeholder="Paste your wallet address"
                                    value={destinationAddress}
                                    onChange={(e) => setDestinationAddress(e.target.value)}
                                    className="h-12 text-lg border-border/50"
                                />
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">Network</Label>
                                    {selectedToken.address_networks ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {selectedToken.address_networks.split(',').map((n) => {
                                                const v = n.trim();
                                                return (
                                                    <Button
                                                        key={v}
                                                        type="button"
                                                        variant={destinationNetwork === v ? 'default' : 'outline'}
                                                        onClick={() => setDestinationNetwork(v)}
                                                    >
                                                        {v}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <Input
                                            placeholder="e.g., ERC20, TRC20, SPL"
                                            value={destinationNetwork}
                                            onChange={(e) => setDestinationNetwork(e.target.value)}
                                        />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Admin configured this token to require a wallet address.
                                </p>
                            </div>
                        )}

                        {/* Phone Number */}
                        <div className="space-y-3">
                            <Label htmlFor="buy-phone" className="text-base font-semibold">M-Pesa Phone Number</Label>
                            <Input
                                id="buy-phone"
                                type="tel"
                                placeholder="254712345678 or 0712345678"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="h-12 text-lg border-border/50"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Format: 254XXXXXXXXX (include country code)
                            </p>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg h-14"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Buy with M-Pesa
                                </>
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
