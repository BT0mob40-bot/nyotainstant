import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, DollarSign, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MemeCoinHeader } from './MemeCoinHeader';

interface MemeCoin {
  id: string;
  token_name: string;
  token_symbol: string;
  description: string;
  image_url: string;
  current_price: number;
  market_cap: number;
  liquidity_raised: number;
  holder_count: number;
  graduated: boolean;
  created_at: string;
  twitter_url?: string;
  telegram_url?: string;
  website_url?: string;
}

export function MemeCoinList() {
  const [memeCoins, setMemeCoins] = useState<MemeCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'trending' | 'new' | 'graduated'>('trending');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMemeCoins();

    // Subscribe to real-time updates with error handling
    const channel = supabase
      .channel('meme-coins-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meme_coins',
        },
        () => {
          fetchMemeCoins();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

    const fetchMemeCoins = async () => {
    try {
      // Fetch Meme Coins
      let memeCoinsQuery = supabase
        .from('meme_coins')
        .select('*')
        .eq('is_active', true);

      // Fetch Trading Tokens
      let tradingTokensQuery = supabase
        .from('trading_tokens')
        .select('*')
        .eq('is_active', true);

      const [memeCoinsResult, tradingTokensResult] = await Promise.all([
        memeCoinsQuery,
        tradingTokensQuery
      ]);

      if (memeCoinsResult.error) throw memeCoinsResult.error;
      if (tradingTokensResult.error) throw tradingTokensResult.error;

      // Map Trading Tokens to MemeCoin interface
      const mappedTradingTokens: MemeCoin[] = (tradingTokensResult.data || []).map((token: any) => ({
        id: token.id,
        token_name: token.token_name,
        token_symbol: token.token_symbol,
        description: token.description || `Trading token on chain ${token.chain_id}`,
        image_url: token.image_url || 'https://placehold.co/400x400/10b981/ffffff?text=' + token.token_symbol,
        current_price: token.current_price || 0,
        market_cap: token.market_cap || 0,
        liquidity_raised: token.liquidity || 0,
        holder_count: token.holder_count || 0,
        graduated: true, // Trading tokens are considered graduated/active
        created_at: token.created_at,
        twitter_url: token.twitter_url,
        telegram_url: token.telegram_url,
        website_url: token.website_url
      }));

      // Combine and Sort
      let allCoins = [...(memeCoinsResult.data || []), ...mappedTradingTokens];

      if (filter === 'graduated') {
        allCoins = allCoins.filter(coin => coin.graduated);
      } else if (filter === 'new') {
        allCoins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else {
        // Trending: sort by liquidity raised
        allCoins.sort((a, b) => b.liquidity_raised - a.liquidity_raised);
      }

      setMemeCoins(allCoins);
    } catch (error) {
      console.error('Error fetching meme coins:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const calculateProgress = (liquidityRaised: number, threshold: number = 85) => {
    return Math.min((liquidityRaised / threshold) * 100, 100);
  };

  return (
    <>
      <MemeCoinHeader />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Meme Coin Marketplace</h2>
            <p className="text-muted-foreground">Buy and sell tokens with M-Pesa</p>
          </div>
        </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="trending">🔥 Trending</TabsTrigger>
          <TabsTrigger value="new">✨ Latest</TabsTrigger>
          <TabsTrigger value="graduated">⭐ Featured</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4 mt-6">
          {loading ? (
            <div className="text-center py-12">Loading meme coins...</div>
          ) : memeCoins.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No meme coins found. Be the first to create one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memeCoins.map((coin) => (
                <Card key={coin.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/meme/${coin.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={coin.image_url}
                        alt={coin.token_name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg truncate">{coin.token_symbol}</CardTitle>
                          {coin.graduated && (
                            <Badge variant="secondary" className="text-xs">
                              🎓 Graduated
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="truncate">{coin.token_name}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {coin.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{coin.description}</p>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <DollarSign className="w-3 h-3" />
                        </div>
                        <div className="font-semibold">${formatNumber(coin.market_cap)}</div>
                        <div className="text-muted-foreground">Market Cap</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <TrendingUp className="w-3 h-3" />
                        </div>
                        <div className="font-semibold">{formatNumber(coin.liquidity_raised)} SOL</div>
                        <div className="text-muted-foreground">Liquidity</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Users className="w-3 h-3" />
                        </div>
                        <div className="font-semibold">{coin.holder_count}</div>
                        <div className="text-muted-foreground">Holders</div>
                      </div>
                    </div>

                    {!coin.graduated && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress to Raydium</span>
                          <span className="font-semibold">{calculateProgress(coin.liquidity_raised).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${calculateProgress(coin.liquidity_raised)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {(coin.twitter_url || coin.telegram_url || coin.website_url) && (
                      <div className="flex gap-2">
                        {coin.twitter_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(coin.twitter_url, '_blank');
                            }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Twitter
                          </Button>
                        )}
                        {coin.telegram_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(coin.telegram_url, '_blank');
                            }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Telegram
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}