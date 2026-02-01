import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Coins, TrendingUp, TrendingDown } from 'lucide-react';

interface TokenBalance {
    id: string;
    balance: number;
    locked_balance: number;
    trading_tokens: {
        id: string;
        token_name: string;
        token_symbol: string;
        current_price?: number; // Optional until schema is updated
    };
}

export function TokenPortfolio() {
    const { user } = useAuth();
    const [balances, setBalances] = useState<TokenBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalValue, setTotalValue] = useState(0);

    useEffect(() => {
        if (user) {
            fetchBalances();
        }

        const channel = supabase
            .channel('portfolio-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_balances',
                    filter: `user_id=eq.${user?.id}`,
                },
                () => fetchBalances()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchBalances = async () => {
        try {
            const { data, error } = await supabase
                .from('user_balances')
                .select(`
          id,
          balance,
          locked_balance,
          trading_tokens (
            id,
            token_name,
            token_symbol,
            current_price
          )
        `)
                .eq('user_id', user?.id)
                .gt('balance', 0);

            if (error) throw error;

            const items = data as any[] || [];
            setBalances(items);

            const total = items.reduce((acc, item) => {
                const price = item.trading_tokens.current_price || 0;
                return acc + (item.balance * price);
            }, 0);
            setTotalValue(total);

        } catch (error) {
            console.error('Error fetching balances:', error);
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

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-primary" />
                        <div>
                            <CardTitle>Token Portfolio</CardTitle>
                            <CardDescription>Your crypto assets</CardDescription>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {balances.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No assets found. Buy some crypto to get started!
                    </p>
                ) : (
                    <div className="space-y-4">
                        {balances.map((item) => {
                            const price = item.trading_tokens.current_price || 0;
                            const value = item.balance * price;

                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="font-bold text-primary">
                                                {item.trading_tokens.token_symbol[0]}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold">{item.trading_tokens.token_name}</p>
                                                <Badge variant="secondary" className="text-xs">
                                                    {item.trading_tokens.token_symbol}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {item.balance.toLocaleString()} {item.trading_tokens.token_symbol}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="font-semibold">${value.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">
                                            ${price.toLocaleString()} / token
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
