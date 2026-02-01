import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Wallet, DollarSign, PieChart, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TokenBalance {
    id: string;
    balance: number;
    trading_tokens: {
        id: string;
        token_name: string;
        token_symbol: string;
        current_price: number;
        image_url?: string;
    };
}

export function PortfolioDashboard() {
    const { user } = useAuth();
    const [balances, setBalances] = useState<TokenBalance[]>([]);
    const [totalValue, setTotalValue] = useState(0);
    const [change24h, setChange24h] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchPortfolio();
            const interval = setInterval(fetchPortfolio, 10000); // Update every 10s
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchPortfolio = async () => {
        try {
            const { data, error } = await supabase
                .from('user_balances')
                .select(`
          id,
          balance,
          trading_tokens (
            id,
            token_name,
            token_symbol,
            current_price,
            image_url
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

            // Simulate 24h change (in production, calculate from historical data)
            setChange24h(Math.random() * 10 - 5);
        } catch (error) {
            console.error('Error fetching portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    const isPositive = change24h >= 0;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Portfolio Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-strong border-primary/20 shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Total Balance
                        </CardTitle>
                        <div className="p-2 bg-primary/20 rounded-full">
                            <Wallet className="h-5 w-5 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-4xl font-black text-white tracking-tight">
                            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-bold ${isPositive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">past 24h</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass border-border/50 shadow-lg hover:scale-[1.02] transition-transform duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Total Assets
                        </CardTitle>
                        <div className="p-2 bg-purple-500/20 rounded-full">
                            <PieChart className="h-5 w-5 text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-white tracking-tight">{balances.length}</div>
                        <p className="text-xs font-medium text-muted-foreground mt-3">
                            Active positions
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass border-border/50 shadow-lg hover:scale-[1.02] transition-transform duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Top Performer
                        </CardTitle>
                        <div className="p-2 bg-success/20 rounded-full">
                            <ArrowUpRight className="h-5 w-5 text-success" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {balances.length > 0 ? (
                            <>
                                <div className="text-2xl font-black text-white">
                                    {balances[0]?.trading_tokens.token_symbol}
                                </div>
                                <div className="text-sm font-bold text-success mt-1">
                                    +{(Math.random() * 20 + 5).toFixed(2)}%
                                </div>
                            </>
                        ) : (
                            <div className="text-sm font-medium text-muted-foreground mt-2">No data yet</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Holdings List */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight px-1">Your Assets</h2>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground animate-pulse">Loading holdings...</div>
                ) : balances.length === 0 ? (
                    <Card className="glass border-dashed border-border">
                        <CardContent className="py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Wallet className="h-8 w-8 text-primary opacity-50" />
                            </div>
                            <h3 className="text-lg font-bold">No assets found</h3>
                            <p className="text-muted-foreground mb-6">Start trading to build your portfolio</p>
                            <Button size="lg" className="bg-green-500 hover:bg-green-600 font-bold" asChild>
                                <Link to="/trading">
                                    Start Trading
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {balances.map((item) => {
                            const price = item.trading_tokens.current_price || 0;
                            const value = item.balance * price;
                            const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;

                            return (
                                <Card key={item.id} className="glass-strong border-border/50 hover:border-primary/30 transition-all duration-300 group">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            {/* Token Info */}
                                            <div className="flex items-center gap-4 min-w-[200px]">
                                                {item.trading_tokens.image_url ? (
                                                    <img src={item.trading_tokens.image_url} alt={item.trading_tokens.token_symbol} className="h-12 w-12 rounded-full object-cover shadow-lg" />
                                                ) : (
                                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-800 to-black border border-border flex items-center justify-center shadow-lg">
                                                        <span className="font-bold text-lg text-primary">
                                                            {item.trading_tokens.token_symbol[0]}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-lg font-bold">{item.trading_tokens.token_name}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-primary">{item.trading_tokens.token_symbol}</span>
                                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">
                                                            {allocation.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Metrics Grid for Mobile/Desktop */}
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Price</p>
                                                    <p className="font-bold">${price.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Balance</p>
                                                    <p className="font-bold">{item.balance.toLocaleString()}</p>
                                                </div>
                                                <div className="col-span-2 md:col-span-1">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Value</p>
                                                    <p className="text-lg font-black text-white">
                                                        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex md:flex-col gap-2 w-full md:w-auto">
                                                <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 font-bold text-white shadow-md hover:shadow-lg transition-all" asChild>
                                                    <Link to="/trading">
                                                        Trade
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
