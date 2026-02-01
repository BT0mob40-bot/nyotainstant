import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, TrendingUp, Users, DollarSign, ExternalLink, Loader2, Copy, Globe, MessageCircle, Zap } from 'lucide-react';
import { MemeCoinHeader } from './MemeCoinHeader';
import { MemeCoinChart } from './MemeCoinChart';
import { MemeCoinComments } from './MemeCoinComments';
import { BuyWithMpesa } from './BuyWithMpesa';
import { useAuth } from '@/contexts/AuthContext';
import { WalletConnect } from './WalletConnect';
import { MyHoldings } from './MyHoldings';

interface MemeCoin {
  id: string;
  token_mint: string;
  token_name: string;
  token_symbol: string;
  description: string;
  image_url: string;
  current_price: number;
  market_cap: number;
  liquidity_raised: number;
  holder_count: number;
  graduated: boolean;
  graduation_threshold: number;
  twitter_url?: string;
  telegram_url?: string;
  website_url?: string;
  created_at: string;
}

interface Trade {
  id: string;
  trade_type: string;
  token_amount: number;
  sol_amount: number;
  price_per_token: number;
  created_at: string;
  user_id: string;
}

export function MemeCoinDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { toast } = useToast();
  const { user } = useAuth();

  const [memeCoin, setMemeCoin] = useState<MemeCoin | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [trading, setTrading] = useState(false);
  const [amount, setAmount] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

  useEffect(() => {
    if (id) {
      fetchMemeCoin();
      fetchTrades();

      // Subscribe to real-time updates
      const coinChannel = supabase
        .channel(`meme-coin-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'meme_coins',
            filter: `id=eq.${id}`,
          },
          () => {
            fetchMemeCoin();
          }
        )
        .subscribe();

      const tradesChannel = supabase
        .channel(`meme-coin-trades-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'meme_coin_trades',
            filter: `meme_coin_id=eq.${id}`,
          },
          () => {
            fetchTrades();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(coinChannel);
        supabase.removeChannel(tradesChannel);
      };
    }
  }, [id]);

  const fetchMemeCoin = async () => {
    try {
      // First try fetching from meme_coins
      const { data: memeCoinData, error: memeCoinError } = await supabase
        .from('meme_coins')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (memeCoinData) {
        setMemeCoin(memeCoinData);
        return;
      }

      // If not found, try trading_tokens
      const { data: tokenData, error: tokenError } = await supabase
        .from('trading_tokens')
        .select('*')
        .eq('id', id)
        .single();

      if (tokenData) {
        const token = tokenData as any;
        // Map trading_token to MemeCoin interface structure
        const mappedToken: MemeCoin = {
          id: token.id,
          token_mint: token.token_address,
          token_name: token.token_name,
          token_symbol: token.token_symbol,
          description: token.description || `Trading token on chain ${token.chain_id}`,
          image_url: token.image_url || 'https://placehold.co/400x400/10b981/ffffff?text=' + token.token_symbol,
          current_price: token.current_price || 0,
          market_cap: token.market_cap || 0,
          liquidity_raised: token.liquidity || 0,
          holder_count: token.holder_count || 0,
          graduated: true,
          graduation_threshold: 0,
          created_at: token.created_at,
          twitter_url: token.twitter_url || '',
          telegram_url: token.telegram_url || '',
          website_url: token.website_url || ''
        };
        setMemeCoin(mappedToken);
      } else {
        throw new Error('Token not found');
      }
    } catch (error) {
      console.error('Error fetching coin:', error);
      toast({
        title: 'Error',
        description: 'Failed to load coin details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async () => {
    setTrades([]);
  };

  const handleTrade = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please login to trade',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!publicKey || !signTransaction) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your Solana wallet first',
        variant: 'destructive',
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setTrading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const functionName = tradeType === 'buy' ? 'buy-meme-coin' : 'sell-meme-coin';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          memeCoinId: id,
          amount: parseFloat(amount),
          walletAddress: publicKey.toString(),
        },
      });

      if (error) throw error;

      toast({
        title: tradeType === 'buy' ? 'Purchase successful! 🎉' : 'Sale successful! 💰',
        description: `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${amount} ${memeCoin?.token_symbol}`,
      });

      setAmount('');
      fetchMemeCoin();
      fetchTrades();
    } catch (error: any) {
      console.error('Trade error:', error);
      toast({
        title: 'Trade failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTrading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(4);
  };

  const calculateProgress = () => {
    if (!memeCoin) return 0;
    if (memeCoin.graduation_threshold === 0) return 100;
    return Math.min((memeCoin.liquidity_raised / memeCoin.graduation_threshold) * 100, 100);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "Copied!",
        description: "Address copied to clipboard",
    });
  };

  const scrollToMpesa = () => {
    const mpesaSection = document.getElementById('mpesa-section');
    if (mpesaSection) {
        mpesaSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-dark">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!memeCoin) {
    return (
      <div className="max-w-4xl mx-auto p-6 min-h-screen gradient-dark flex items-center justify-center">
        <Card className="glass-strong border-primary/20">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Meme coin not found</p>
            <Button onClick={() => navigate('/')} className="mt-4" variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark text-foreground flex flex-col">
        <MemeCoinHeader />
        
        <div className="container mx-auto px-4 py-6 flex-1">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors pl-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Token Header Info */}
                    <div className="flex flex-col md:flex-row items-start gap-6 mb-2">
                        <img
                            src={memeCoin.image_url || 'https://placehold.co/400x400/10b981/ffffff?text=Token'}
                            alt={memeCoin.token_name}
                            className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-primary/20 shadow-xl"
                        />
                        <div className="flex-1 space-y-2 w-full">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">{memeCoin.token_name}</h1>
                                    <Badge variant="outline" className="text-primary border-primary/50 text-lg py-1 px-3">
                                        {memeCoin.token_symbol}
                                    </Badge>
                                    {memeCoin.graduated && (
                                        <Badge className="bg-gradient-gold text-black border-none animate-pulse-glow">
                                            🎓 Graduated
                                        </Badge>
                                    )}
                                </div>
                                <Button
                                    onClick={scrollToMpesa}
                                    className="relative overflow-hidden h-11 px-6 rounded-xl font-extrabold text-black bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 shadow-[0_10px_25px_rgba(255,193,7,0.35)] hover:shadow-[0_12px_28px_rgba(255,193,7,0.45)] hover:scale-[1.02] transition-all"
                                >
                                    <div className="absolute inset-0 opacity-30 pointer-events-none" />
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-5 h-5" />
                                        <span>Buy Now</span>
                                    </div>
                                </Button>
                            </div>
                            
                            <div className="flex items-center gap-4 text-muted-foreground text-sm">
                                <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-md" onClick={() => copyToClipboard(memeCoin.token_mint)}>
                                    <span className="font-mono">{memeCoin.token_mint.slice(0, 6)}...{memeCoin.token_mint.slice(-4)}</span>
                                    <Copy className="w-3 h-3" />
                                </div>
                                <span>•</span>
                                <span>Created {new Date(memeCoin.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="flex gap-2 pt-2">
                                {memeCoin.twitter_url && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 hover:text-[#1DA1F2]" onClick={() => window.open(memeCoin.twitter_url, '_blank')}>
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    </Button>
                                )}
                                {memeCoin.telegram_url && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 hover:text-[#0088cc]" onClick={() => window.open(memeCoin.telegram_url, '_blank')}>
                                        <MessageCircle className="w-4 h-4" />
                                    </Button>
                                )}
                                {memeCoin.website_url && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 hover:text-primary" onClick={() => window.open(memeCoin.website_url, '_blank')}>
                                        <Globe className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Card className="glass-strong border-primary/10">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Market Cap</p>
                                <p className="text-lg font-bold text-white">${formatNumber(memeCoin.market_cap)}</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-strong border-primary/10">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Price</p>
                                <p className="text-lg font-bold text-success">${memeCoin.current_price.toFixed(8)}</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-strong border-primary/10">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Holders</p>
                                <p className="text-lg font-bold text-white">{memeCoin.holder_count}</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-strong border-primary/10">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Liquidity</p>
                                <p className="text-lg font-bold text-primary">{formatNumber(memeCoin.liquidity_raised)} SOL</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="glass-strong border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Price Chart
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <MemeCoinChart memeCoinId={id!} currentPrice={memeCoin.current_price} />
                        </CardContent>
                    </Card>

                    <Card className="glass-strong border-white/5">
                        <CardHeader>
                            <CardTitle>About {memeCoin.token_name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-white/80 leading-relaxed">
                                {memeCoin.description || "No description available for this token."}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Comments Section */}
                    <MemeCoinComments memeCoinId={id!} />
                </div>

                {/* Right Column: Trading & Bonding Curve */}
                <div className="space-y-6">
                    <Card className="glass-strong border-primary/20 shadow-2xl shadow-primary/5">
                        <CardHeader className="bg-primary/5 border-b border-primary/10">
                            <CardTitle className="text-xl">Trade {memeCoin.token_symbol}</CardTitle>
                            <CardDescription>
                                Balance: 0 SOL
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as 'buy' | 'sell')} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-black/20">
                                    <TabsTrigger value="buy" className="data-[state=active]:bg-success data-[state=active]:text-white">Buy</TabsTrigger>
                                    <TabsTrigger value="sell" className="data-[state=active]:bg-danger data-[state=active]:text-white">Sell</TabsTrigger>
                                </TabsList>

                                <div className="mt-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">
                                            {tradeType === 'buy' ? 'Amount (SOL)' : `Amount (${memeCoin.token_symbol})`}
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="pr-16 bg-black/20 border-white/10 focus:border-primary/50 text-lg"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">
                                                {tradeType === 'buy' ? 'SOL' : memeCoin.token_symbol}
                                            </div>
                                        </div>
                                    </div>

                                    {amount && parseFloat(amount) > 0 && (
                                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">You receive:</span>
                                                <span className="font-bold text-primary">
                                                    {tradeType === 'buy' 
                                                        ? `~${(parseFloat(amount) / memeCoin.current_price).toFixed(2)} ${memeCoin.token_symbol}`
                                                        : `~${(parseFloat(amount) * memeCoin.current_price).toFixed(4)} SOL`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                          className={`w-full text-lg font-bold h-12 shadow-lg transition-all duration-200 ${
                            tradeType === 'buy' 
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-yellow-500/20' 
                            : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/20'
                          }`}
                          onClick={handleTrade}
                          disabled={trading || !publicKey || !amount || parseFloat(amount) <= 0}
                        >
                                        {trading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {tradeType === 'buy' ? <TrendingUp className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                                <span>{tradeType === 'buy' ? 'Buy' : 'Sell'} {memeCoin.token_symbol}</span>
                                            </div>
                                        )}
                                    </Button>
                                </div>
                            </Tabs>
                        </CardContent>
                    </Card>

                    <div id="mpesa-section">
                         <BuyWithMpesa 
                            memeCoinId={id!} 
                            tokenSymbol={memeCoin.token_symbol} 
                            currentPrice={memeCoin.current_price}
                            onSuccess={() => {
                                fetchMemeCoin();
                                fetchTrades();
                            }}
                         />
                    </div>

                    <Card className="glass-strong border-white/5">
                        <CardHeader>
                            <CardTitle className="text-lg">Bonding Curve Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Raised:</span>
                                    <span className="font-mono text-white">
                                        {memeCoin.liquidity_raised.toFixed(2)} / {memeCoin.graduation_threshold || 85} SOL
                                    </span>
                                </div>
                                <div className="h-4 bg-black/20 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-1000 ease-out"
                                        style={{ width: `${calculateProgress()}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    Reaching 100% triggers automatic liquidity listing on Raydium.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <WalletConnect />
                </div>
            </div>
        </div>
    </div>
  );
}
