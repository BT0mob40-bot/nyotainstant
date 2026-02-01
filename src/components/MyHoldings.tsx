import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Holding {
  id: string;
  token_balance: number;
  total_bought: number;
  total_sold: number;
  realized_profit: number;
  meme_coins: {
    id: string;
    token_name: string;
    token_symbol: string;
    image_url: string | null;
    current_price: number;
  };
}

export function MyHoldings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHoldings();
    }

    // Subscribe to real-time updates for holdings
    const channel = supabase
      .channel('holdings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meme_coin_holders',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          if (user) fetchHoldings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchHoldings = async () => {
    try {
      const { data, error } = await supabase
        .from('meme_coin_holders')
        .select(`
          *,
          meme_coins (
            id,
            token_name,
            token_symbol,
            image_url,
            current_price
          )
        `)
        .eq('user_id', user?.id)
        .gt('token_balance', 0)
        .order('token_balance', { ascending: false });

      if (error) throw error;
      setHoldings(data as any || []);
    } catch (error) {
      console.error('Error fetching holdings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            <CardTitle>My Holdings</CardTitle>
          </div>
          <CardDescription>Your meme coin portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            You don't own any tokens yet. Start buying to build your portfolio!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          <CardTitle>My Holdings</CardTitle>
        </div>
        <CardDescription>Your meme coin portfolio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {holdings.map((holding) => {
          const currentValue = holding.token_balance * holding.meme_coins.current_price;
          const profitLoss = holding.realized_profit;
          
          return (
            <div
              key={holding.id}
              onClick={() => navigate(`/meme/${holding.meme_coins.id}`)}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
            >
              {holding.meme_coins.image_url ? (
                <img
                  src={holding.meme_coins.image_url}
                  alt={holding.meme_coins.token_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">
                    {holding.meme_coins.token_name}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {holding.meme_coins.token_symbol}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{holding.token_balance.toLocaleString()} tokens</span>
                  <span>•</span>
                  <span>{currentValue.toFixed(2)} KES</span>
                </div>
              </div>

              {profitLoss !== 0 && (
                <Badge
                  variant={profitLoss > 0 ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {profitLoss > 0 ? '+' : ''}{profitLoss.toFixed(2)} KES
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
