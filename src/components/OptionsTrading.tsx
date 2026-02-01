import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Timer, Activity, BarChart3, Wallet, Plus, Smartphone, Loader2, DollarSign } from 'lucide-react';

interface TradingPair {
    symbol: string;
    name: string;
    payout_percentage: number;
}

interface FiatBalance {
    balance: number;
}

interface ActiveTrade {
    id: string;
    pair: string;
    trade_type: 'buy' | 'sell';
    investment_amount: number;
    entry_price: number;
    payout_percentage: number;
    expires_at: string;
    opened_at: string;
}

interface PricePoint {
    time: number;
    price: number;
}

interface UserGrant {
    id: string;
    grant_status: 'locked' | 'unlocking' | 'unlocked' | 'claimed';
    grant_amount: number;
    unlock_deposit_amount: number;
}

// Default trading pairs (hardcoded for now)
const TRADING_PAIRS: TradingPair[] = [
    { symbol: 'EUR/USD', name: 'Euro vs US Dollar', payout_percentage: 86 },
    { symbol: 'GBP/USD', name: 'British Pound vs US Dollar', payout_percentage: 86 },
    { symbol: 'USD/JPY', name: 'US Dollar vs Japanese Yen', payout_percentage: 86 },
    { symbol: 'BTC/USD', name: 'Bitcoin vs US Dollar', payout_percentage: 88 },
    { symbol: 'ETH/USD', name: 'Ethereum vs US Dollar', payout_percentage: 88 },
    { symbol: 'XAU/USD', name: 'Gold vs US Dollar', payout_percentage: 85 },
];

export function OptionsTrading() {
    const { user } = useAuth();
    const [selectedPair, setSelectedPair] = useState<string>('EUR/USD');
    const [fiatBalance, setFiatBalance] = useState<number>(0);
    const [investment, setInvestment] = useState<number>(100);
    const [duration, setDuration] = useState<number>(60);
    const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
    const [priceData, setPriceData] = useState<PricePoint[]>([]);
    const [currentPrice, setCurrentPrice] = useState<number>(1.195786);
    const [isTrading, setIsTrading] = useState(false);
    const [totalProfit, setTotalProfit] = useState<number>(0);
    const [totalLoss, setTotalLoss] = useState<number>(0);
    const [totalTrades, setTotalTrades] = useState<number>(0);
    const [winningTrades, setWinningTrades] = useState<number>(0);

    // M-Pesa Deposit State
    const [depositDialogOpen, setDepositDialogOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isDepositing, setIsDepositing] = useState(false);

    // Grant System State
    const [userGrant, setUserGrant] = useState<UserGrant | null>(null);
    const [grantDialogOpen, setGrantDialogOpen] = useState(false);
    const [isUnlockingGrant, setIsUnlockingGrant] = useState(false);

    // Withdrawal State
    const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawPhone, setWithdrawPhone] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    // Dynamic Limits
    const [minDeposit, setMinDeposit] = useState(500);
    const [minWithdraw, setMinWithdraw] = useState(100);

    // Focus Mode
    const [isCollapsed, setIsCollapsed] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (user) {
            fetchFiatBalance();
            fetchActiveTrades();
            fetchTradeStats();
            fetchGrantStatus();
            fetchSystemSettings();
            initializePriceData();
        }
    }, [user]);

    useEffect(() => {
        if (priceData.length > 0) {
            drawChart();
        }
    }, [priceData, activeTrades]);

    useEffect(() => {
        // Simulate real-time price updates
        const interval = setInterval(() => {
            updatePrice();
        }, 1000);

        return () => clearInterval(interval);
    }, [currentPrice]);

    useEffect(() => {
        // Check for expired trades
        const interval = setInterval(() => {
            checkExpiredTrades();
        }, 1000);

        return () => clearInterval(interval);
    }, [activeTrades]);

    const fetchFiatBalance = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('balance, portfolio_value')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.warn('Profiles fetch error:', error);
                return;
            }

            if (data) {
                setFiatBalance(Number((data as any).balance) || 0);
            }
        } catch (err) {
            console.error('Failed to fetch balance:', err);
        }
    };

    const fetchActiveTrades = async () => {
        if (!user) return;

        // Using crypto_transactions to store trades temporarily
        const { data } = await supabase
            .from('crypto_transactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('transaction_type', 'buy') // Using 'buy' type for active options trades
            .is('notes', null) // null notes means active, non-null means settled
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) {
            const trades: ActiveTrade[] = data.map((t: any) => ({
                id: t.id,
                pair: t.token_id || 'EUR/USD',
                trade_type: t.amount > 0 ? 'buy' : 'sell',
                investment_amount: Math.abs(t.amount),
                entry_price: t.balance_before / 1000000, // Stored in balance_before
                payout_percentage: 86,
                expires_at: new Date(new Date(t.created_at).getTime() + 60000).toISOString(),
                opened_at: t.created_at,
            }));
            setActiveTrades(trades);
        }
    };

    const fetchTradeStats = async () => {
        if (!user) return;

        const { data } = await supabase
            .from('crypto_transactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('transaction_type', 'buy')
            .not('notes', 'is', null); // Settled trades have notes

        if (data) {
            let profit = 0;
            let loss = 0;
            let wins = 0;

            data.forEach((t: any) => {
                if (t.notes === 'won') {
                    profit += Math.abs(t.amount) * 0.86;
                    wins++;
                } else if (t.notes === 'lost') {
                    loss += Math.abs(t.amount);
                }
            });

            setTotalProfit(profit);
            setTotalLoss(loss);
            setTotalTrades(data.length);
            setWinningTrades(wins);
        }
    };

    const initializePriceData = () => {
        const now = Date.now();
        const initialData: PricePoint[] = [];
        let price = 1.195786;

        for (let i = 60; i >= 0; i--) {
            const volatility = 0.00005;
            const change = (Math.random() - 0.5) * volatility;
            price += change;
            initialData.push({
                time: now - i * 1000,
                price: price,
            });
        }

        setPriceData(initialData);
        setCurrentPrice(price);
    };

    const updatePrice = () => {
        const volatility = 0.00008;
        const trend = Math.random() > 0.5 ? 1 : -1;
        const change = (Math.random() * volatility * trend);
        const newPrice = currentPrice + change;

        setCurrentPrice(newPrice);
        setPriceData(prev => {
            const newData = [...prev, { time: Date.now(), price: newPrice }];
            return newData.slice(-60);
        });
    };

    const drawChart = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        // Clear canvas with dark background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        if (priceData.length < 2) return;

        // Calculate price range
        const prices = priceData.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || 0.0001;

        // Draw grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw price labels with better contrast
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        for (let i = 0; i <= 5; i++) {
            const price = maxPrice - (priceRange / 5) * i;
            const y = (height / 5) * i;
            ctx.fillText(price.toFixed(6), 8, y + 14);
        }

        // Draw price line with glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#3b82f6';
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';

        priceData.forEach((point, index) => {
            const x = (width / (priceData.length - 1)) * index;
            const y = height - ((point.price - minPrice) / priceRange) * height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

        ctx.beginPath();
        priceData.forEach((point, index) => {
            const x = (width / (priceData.length - 1)) * index;
            const y = height - ((point.price - minPrice) / priceRange) * height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw active trade markers with payout/settlement lines
        activeTrades.forEach(trade => {
            const tradeTime = new Date(trade.opened_at).getTime();
            const expiryTime = new Date(trade.expires_at).getTime();
            const dataIndex = priceData.findIndex(p => p.time >= tradeTime);

            if (dataIndex >= 0) {
                const x = (width / (priceData.length - 1)) * dataIndex;
                const y = height - ((trade.entry_price - minPrice) / priceRange) * height;

                // Draw entry line (dashed)
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = trade.trade_type === 'buy' ? '#10b981' : '#ef4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(width, y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw marker circle with glow
                ctx.shadowBlur = 12;
                ctx.shadowColor = trade.trade_type === 'buy' ? '#10b981' : '#ef4444';
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.fillStyle = trade.trade_type === 'buy' ? '#10b981' : '#ef4444';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Draw arrow
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(trade.trade_type === 'buy' ? '↑' : '↓', x, y + 5);

                // Draw payout target line (dotted)
                const payoutMultiplier = trade.trade_type === 'buy' ? 1.001 : 0.999;
                const payoutPrice = trade.entry_price * payoutMultiplier;
                const payoutY = height - ((payoutPrice - minPrice) / priceRange) * height;

                ctx.setLineDash([2, 4]);
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x, payoutY);
                ctx.lineTo(width, payoutY);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });

        // Draw current price indicator with bold styling
        const currentY = height - ((currentPrice - minPrice) / priceRange) * height;
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, currentY - 2, width, 4);

        // Price label with background
        ctx.fillStyle = '#1e40af';
        ctx.fillRect(width - 95, currentY - 16, 90, 32);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(currentPrice.toFixed(6), width - 8, currentY + 5);
    };

    const fetchSystemSettings = async () => {
        const { data } = await (supabase as any).from('system_settings').select('setting_key, setting_value');
        if (data) {
            const minDep = (data as any).find((s: any) => s.setting_key === 'minimum_deposit');
            const minWith = (data as any).find((s: any) => s.setting_key === 'minimum_withdrawal');
            if (minDep) setMinDeposit(Number(minDep.setting_value));
            if (minWith) setMinWithdraw(Number(minWith.setting_value));
        }
    };

    const fetchGrantStatus = async () => {
        if (!user) return;

        // First apply the creation trigger if needed by checking/inserting
        // We rely on the backend trigger, but fetching will show if it exists
        const { data, error } = await (supabase as any)
            .from('user_grants')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) {
            setUserGrant(data as any); // Type assertion for now until types generated
        } else if (!data && (!error || error.code === 'PGRST116')) {
            // Backfill: If no grant exists for current user, create one so they can see the feature
            const { data: newGrant, error: createError } = await (supabase as any)
                .from('user_grants')
                .insert({
                    user_id: user.id,
                    grant_status: 'locked',
                    grant_amount: 20000,
                    unlock_deposit_amount: 1500
                })
                .select()
                .single();

            if (newGrant) {
                setUserGrant(newGrant as any);
            } else if (createError) {
                console.error("Error creating grant:", createError);
            }
        }
    };

    const handleGrantUnlock = async () => {
        if (!user || !phoneNumber) {
            toast.error('Please enter your phone number');
            return;
        }

        try {
            setIsUnlockingGrant(true);
            const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
                body: {
                    phone_number: phoneNumber,
                    amount: 1500, // Fixed amount for grant unlock
                    token_id: 'grant_unlock',
                }
            });

            if (error) throw error;

            toast.success('STK Push sent! Enter PIN to unlock your KES 20,000 grant.');
            setGrantDialogOpen(false);

            // Poll for status update or optimistic update
            setTimeout(fetchGrantStatus, 5000); // Check after 5s

        } catch (error: any) {
            console.error('Grant unlock error:', error);
            toast.error(error.message || 'Failed to initiate grant unlock');
        } finally {
            setIsUnlockingGrant(false);
        }
    };

    const handleWithdraw = async () => {
        if (!user) return;
        if (!withdrawPhone || !withdrawAmount) {
            toast.error('Please enter phone number and amount');
            return;
        }
        const amount = parseFloat(withdrawAmount);
        if (amount < minWithdraw) {
            toast.error(`Minimum withdrawal is KES ${minWithdraw}`);
            return;
        }
        if (amount > fiatBalance) {
            toast.error('Insufficient balance');
            return;
        }

        setIsWithdrawing(true);
        try {
            const { error } = await (supabase as any).from('fiat_transactions').insert({
                user_id: user.id,
                amount: amount,
                type: 'withdrawal',
                status: 'pending',
                phone_number: withdrawPhone,
                description: 'Options Trading Withdrawal'
            });

            if (error) throw error;
            toast.success('Withdrawal request sent! Admin will approve shortly.');
            setWithdrawDialogOpen(false);
            setWithdrawAmount('');
        } catch (error: any) {
            toast.error(error.message || 'Withdrawal failed');
        } finally {
            setIsWithdrawing(false);
        }
    };
    const handleDeposit = async () => {
        if (!user) return;

        if (!phoneNumber || !depositAmount) {
            toast.error('Please enter phone number and amount');
            return;
        }

        const amount = parseFloat(depositAmount);
        if (amount < minDeposit) {
            toast.error(`Minimum deposit is KES ${minDeposit}`);
            return;
        }

        setIsDepositing(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await supabase.functions.invoke('mpesa-stk-push', {
                body: {
                    phone_number: phoneNumber,
                    amount: amount,
                    token_id: 'options_deposit',
                },
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                },
            });

            if (response.error) throw response.error;

            toast.success('STK Push sent! Check your phone to complete payment.');
            setDepositDialogOpen(false);
            setPhoneNumber('');
            setDepositAmount('');
        } catch (error: any) {
            toast.error(error.message || 'Deposit failed');
        } finally {
            setIsDepositing(false);
        }
    };

    const placeTrade = async (tradeType: 'buy' | 'sell') => {
        if (!user) return;

        if (fiatBalance < investment) {
            toast.error(`Insufficient balance. You need KES ${investment}.`);
            setDepositDialogOpen(true);
            return;
        }

        setIsTrading(true);

        try {
            const selectedPairData = TRADING_PAIRS.find(p => p.symbol === selectedPair);
            const expiresAt = new Date(Date.now() + duration * 1000);

            // Store trade in crypto_transactions temporarily
            const { error: tradeError } = await supabase
                .from('crypto_transactions')
                .insert({
                    user_id: user.id,
                    token_id: selectedPair,
                    transaction_type: 'buy',
                    amount: tradeType === 'buy' ? investment : -investment,
                    balance_before: currentPrice * 1000000, // Store entry price
                    balance_after: expiresAt.getTime(), // Store expiry time
                });

            if (tradeError) throw tradeError;

            // Update fiat balance
            const { error: balanceError } = await (supabase as any)
                .from('profiles')
                .update({
                    balance: (fiatBalance as any) - investment,
                })
                .eq('id', user.id);

            if (balanceError) throw balanceError;

            toast.success(`${tradeType.toUpperCase()} trade placed!`, {
                description: `Pair: ${selectedPair} | Investment: KES ${investment}`,
            });

            fetchFiatBalance();
            fetchActiveTrades();
        } catch (error: any) {
            toast.error(error.message || 'Failed to place trade');
        } finally {
            setIsTrading(false);
        }
    };

    const checkExpiredTrades = async () => {
        if (!user || activeTrades.length === 0) return;

        const now = new Date();
        const expiredTrades = activeTrades.filter(trade =>
            new Date(trade.expires_at) <= now
        );

        for (const trade of expiredTrades) {
            await settleTrade(trade);
        }
    };

    const settleTrade = async (trade: ActiveTrade) => {
        if (!user) return;

        const exitPrice = currentPrice;
        let status: 'won' | 'lost';
        let profitLoss: number;

        // House Always Wins Logic (85% House Edge)
        const isRigged = Math.random() < 0.85;

        if (isRigged) {
            status = 'lost';
        } else {
            // Natural outcome for the remaining 15%
            if (trade.trade_type === 'buy') {
                status = exitPrice > trade.entry_price ? 'won' : 'lost';
            } else {
                status = exitPrice < trade.entry_price ? 'won' : 'lost';
            }
        }

        if (status === 'won') {
            profitLoss = trade.investment_amount * (trade.payout_percentage / 100);
        } else {
            profitLoss = -trade.investment_amount;
        }

        // Update trade status
        await supabase
            .from('crypto_transactions')
            .update({
                notes: status,
            })
            .eq('id', trade.id);

        // Update fiat balance
        const newBalance = (fiatBalance as any) + trade.investment_amount + profitLoss;
        await (supabase as any)
            .from('profiles')
            .update({
                balance: newBalance,
            })
            .eq('id', user.id);

        toast[status === 'won' ? 'success' : 'error'](
            `Trade ${status}!`,
            {
                description: `${status === 'won' ? '+' : ''}KES ${profitLoss.toFixed(2)}`,
            }
        );

        fetchFiatBalance();
        fetchActiveTrades();
        fetchTradeStats();
    };

    const getTimeRemaining = (expiresAt: string) => {
        const now = new Date().getTime();
        const expiry = new Date(expiresAt).getTime();
        const diff = Math.max(0, expiry - now);
        return Math.floor(diff / 1000);
    };

    const winRate = totalTrades > 0
        ? ((winningTrades / totalTrades) * 100).toFixed(1)
        : '0.0';

    const selectedPairData = TRADING_PAIRS.find(p => p.symbol === selectedPair);

    return (
        <div className="flex flex-col lg:h-[calc(100vh-140px)] lg:min-h-[700px] w-full bg-[#050505] border border-zinc-800 lg:rounded-[2.5rem] overflow-hidden lg:flex-row relative shadow-[0_0_100px_rgba(0,0,0,1)]">

            {/* 1. Main Trading Workspace (The Chart) */}
            <div className="relative order-1 flex-grow lg:order-1 select-none overflow-hidden group border-b lg:border-b-0 lg:border-r border-zinc-900 h-[50vh] lg:h-auto">
                <canvas ref={canvasRef} className="w-full h-full block bg-black" />

                {/* HUD: Identity & Liquidity (Floating Overlays) */}
                <div className="absolute top-4 left-4 right-4 flex flex-col gap-3 pointer-events-none">
                    <div className="flex items-center justify-between w-full">
                        {/* Balance Hub */}
                        <div className="bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-1.5 rounded-full flex items-center gap-3 pr-4 shadow-2xl pointer-events-auto ring-1 ring-white/5">
                            <div className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center bg-blue-600 rounded-full shadow-lg">
                                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Available</p>
                                <p className="text-sm font-black text-white leading-none">KES {fiatBalance.toLocaleString()}</p>
                            </div>
                            <div className="sm:hidden">
                                <p className="text-xs font-black text-white leading-none">KES {fiatBalance.toLocaleString()}</p>
                            </div>

                            {/* Outstanding Deposit Button */}
                            <Button
                                size="sm"
                                className="h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 ml-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] border-b-2 border-emerald-700 active:border-b-0 transition-all uppercase text-[10px]"
                                onClick={() => setDepositDialogOpen(true)}
                            >
                                <Plus className="h-3 w-3 mr-1" /> Deposit
                            </Button>
                        </div>

                        {/* Outstanding Withdraw Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-zinc-900/90 backdrop-blur-md border border-white/10 text-rose-400 hover:bg-rose-500 hover:text-white font-black rounded-full px-4 h-9 shadow-xl pointer-events-auto uppercase text-[10px]"
                            onClick={() => setWithdrawDialogOpen(true)}
                        >
                            <TrendingDown className="h-3 w-3 mr-1" /> Withdraw
                        </Button>
                    </div>

                    {/* Pair Selector Hub */}
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <div className="bg-zinc-950/90 backdrop-blur-xl border border-white/5 rounded-2xl p-1 flex items-center gap-2 shadow-2xl ring-1 ring-white/5">
                            <Select value={selectedPair} onValueChange={setSelectedPair}>
                                <SelectTrigger className="w-[110px] sm:w-[130px] bg-transparent border-none text-zinc-100 font-black h-8 sm:h-9 focus:ring-0 text-xs sm:text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                                    {TRADING_PAIRS.map(p => (
                                        <SelectItem key={p.symbol} value={p.symbol} className="focus:bg-zinc-800 font-bold">{p.symbol}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="h-4 w-[1px] bg-zinc-800"></div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-xl">
                                <Activity className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-400 font-black text-[10px]">+{selectedPairData?.payout_percentage}%</span>
                            </div>
                        </div>

                        {/* Ambassador Gift (Grant) - High Visibility Pill */}
                        {userGrant && (userGrant.grant_status === 'locked' || userGrant.grant_status === 'unlocking') && (
                            <Button
                                onClick={() => setGrantDialogOpen(true)}
                                className="h-8 sm:h-9 px-4 sm:px-6 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black font-black text-[9px] sm:text-[10px] rounded-full shadow-[0_0_25px_rgba(245,158,11,0.3)] border-t border-white/30 animate-pulse"
                            >
                                <DollarSign className="h-3 w-3 mr-1" /> CLAIM 20K GIFT
                            </Button>
                        )}
                    </div>
                </div>

                {/* desktop Stats HUD */}
                <div className="absolute top-4 right-4 hidden lg:flex flex-col gap-2">
                    <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-2xl px-6 py-3 flex items-center gap-8 shadow-2xl">
                        <div className="text-center">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Profit</p>
                            <p className="text-sm font-black text-emerald-400 font-mono tracking-tighter">+{totalProfit.toLocaleString()}</p>
                        </div>
                        <div className="h-6 w-[1px] bg-zinc-800"></div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Win Rate</p>
                            <p className="text-sm font-black text-white font-mono tracking-tighter">{winRate}%</p>
                        </div>
                    </div>
                </div>

                {/* Live Price Execution HUD */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none group-hover:translate-x-0 translate-x-1 transition-transform">
                    <div className="bg-blue-600 text-white font-mono font-black py-3 sm:py-4 px-5 sm:px-6 rounded-l-[1.5rem] shadow-[0_0_40px_rgba(37,99,235,0.5)] flex items-center gap-3 sm:gap-4 border-l border-white/20">
                        <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-white animate-ping"></div>
                        <span className="text-lg sm:text-2xl tracking-tighter">{currentPrice.toFixed(6)}</span>
                    </div>
                </div>

                {/* Active Position Tracking */}
                {activeTrades.length > 0 && (
                    <div className="absolute bottom-6 left-6 right-6 lg:right-auto pointer-events-auto">
                        <div className="bg-blue-600 border-2 border-white/20 rounded-[1.5rem] p-4 flex items-center justify-between lg:justify-start gap-8 shadow-[0_20px_50px_rgba(37,99,235,0.4)] ring-1 ring-white/10">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 flex items-center justify-center bg-white/20 rounded-xl">
                                    <Timer className="h-5 w-5 text-white animate-pulse" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest leading-none">Position Live</span>
                                    <span className="text-lg font-black text-white leading-none mt-1 uppercase tracking-tight">{activeTrades[0].pair}</span>
                                </div>
                            </div>
                            <div className="h-10 w-[1.5px] bg-white/20 hidden lg:block"></div>
                            <div className="flex flex-col items-end lg:items-start">
                                <span className="text-[9px] font-black text-blue-100 uppercase leading-none">Auto-Expiry</span>
                                <span className="text-2xl font-black text-white font-mono leading-none mt-1">{getTimeRemaining(activeTrades[0].expires_at)}s</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Execution Terminal (Controls) */}
            <div className="w-full lg:w-[420px] bg-[#080808] flex flex-col order-2 z-10 p-5 sm:p-8 relative shadow-[-20px_0_100px_rgba(0,0,0,0.5)] border-t lg:border-t-0 border-zinc-800 max-h-screen">
                <div className="w-full flex flex-col h-full gap-6 overflow-hidden">

                    {/* Call/Put Execution Engines (Mobile Optimization) */}
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:order-3 pt-2 shrink-0">
                        <Button
                            className="w-full h-16 sm:h-24 bg-emerald-500 hover:bg-emerald-400 text-black font-black flex flex-col items-center justify-center gap-0.5 rounded-2xl shadow-[0_15px_40px_rgba(16,185,129,0.2)] group transition-all"
                            onClick={() => placeTrade('buy')}
                            disabled={isTrading}
                        >
                            <TrendingUp className="h-5 w-5 sm:h-8 sm:w-8 transition-transform group-hover:-translate-y-1" />
                            <span className="text-lg sm:text-2xl tracking-tighter font-black">CALL</span>
                        </Button>
                        <Button
                            className="w-full h-16 sm:h-24 bg-rose-500 hover:bg-rose-400 text-white font-black flex flex-col items-center justify-center gap-0.5 rounded-2xl shadow-[0_15px_40px_rgba(244,63,94,0.2)] group transition-all"
                            onClick={() => placeTrade('sell')}
                            disabled={isTrading}
                        >
                            <TrendingDown className="h-5 w-5 sm:h-8 sm:w-8 transition-transform group-hover:translate-y-1" />
                            <span className="text-lg sm:text-2xl tracking-tighter font-black">PUT</span>
                        </Button>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar space-y-8 pr-1">
                        {/* Investment Setup */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end px-1">
                                <Label className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em]">Stake Amount</Label>
                                <span className="text-xl font-black text-white tracking-tighter">KES {investment}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {[500, 1000, 2500, 5000].map(amt => (
                                    <Button
                                        key={amt}
                                        variant="outline"
                                        className={`h-10 font-black rounded-lg border-2 text-[10px] ${investment === amt ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30' : 'bg-transparent border-zinc-800 text-zinc-500'}`}
                                        onClick={() => setInvestment(amt)}
                                    >
                                        {amt >= 1000 ? `${amt / 1000}K` : amt}
                                    </Button>
                                ))}
                            </div>
                            <Slider
                                value={[investment]}
                                onValueChange={(vals) => setInvestment(vals[0])}
                                max={Math.min(fiatBalance + 5000, 100000)}
                                step={100}
                                className="py-4"
                            />
                        </div>

                        {/* Expiry Setup */}
                        <div className="space-y-4">
                            <Label className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] block px-1">Trade Duration</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {[30, 60, 300].map(s => (
                                    <Button
                                        key={s}
                                        variant="outline"
                                        className={`h-10 font-black rounded-lg border-2 text-[10px] ${duration === s ? 'bg-white text-black border-white shadow-xl' : 'bg-transparent border-zinc-800 text-zinc-600'}`}
                                        onClick={() => setDuration(s)}
                                    >
                                        {s === 300 ? '5 MIN' : `${s} SEC`}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* RE-ADDED: Individual Active Trades List */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <Label className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em]">Open Positions</Label>
                                <Badge className="bg-blue-600 text-white text-[10px] font-black">{activeTrades.length}</Badge>
                            </div>
                            <div className="space-y-2">
                                {activeTrades.length === 0 ? (
                                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 text-center">
                                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">No Active trades</p>
                                    </div>
                                ) : (
                                    activeTrades.map(trade => (
                                        <div key={trade.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between group hover:border-blue-500/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${trade.trade_type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {trade.trade_type === 'buy' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-white leading-none uppercase">{trade.pair}</p>
                                                    <p className="text-[9px] font-bold text-zinc-500 mt-1 leading-none">KES {trade.investment_amount}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-white font-mono leading-none tracking-tighter">{getTimeRemaining(trade.expires_at)}s</p>
                                                <div className="h-1 w-12 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                                                    <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Footer Stats & Withdraw */}
                    <div className="pt-4 border-t border-zinc-900 mt-auto shrink-0 flex flex-col gap-4 bg-[#080808]">
                        <div className="flex justify-between items-center px-2">
                            <div className="text-center">
                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Profit</p>
                                <p className="text-xs font-black text-emerald-400 tracking-tighter">+{totalProfit.toLocaleString()}</p>
                            </div>
                            <div className="h-6 w-[1px] bg-zinc-800"></div>
                            <div className="text-center">
                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Win Rate</p>
                                <p className="text-xs font-black text-white tracking-tighter">{winRate}%</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg border-zinc-800 text-rose-500 hover:bg-rose-500 hover:text-white font-black text-[10px] uppercase ml-4"
                                onClick={() => setWithdrawDialogOpen(true)}
                            >
                                Withdraw
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Global System Overlays (Enhanced Responsiveness) --- */}

            <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-[2.5rem] p-0 overflow-hidden ring-1 ring-white/10 sm:max-w-[420px] max-h-[90vh] flex flex-col">
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-900 p-8 sm:p-10 text-center relative shrink-0">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                        <h2 className="text-3xl sm:text-4xl font-black mb-1 tracking-tighter relative z-10">Add Capital</h2>
                        <p className="text-emerald-100/60 text-[10px] font-black uppercase tracking-[0.3em] relative z-10">Instant Funding</p>
                    </div>
                    <div className="p-8 sm:p-10 space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Registered Phone</Label>
                            <Input
                                placeholder="2547XXXXXXXX"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 h-14 rounded-2xl font-black text-lg text-white text-center focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Stake Amount (KES)</Label>
                            <Input
                                type="number"
                                placeholder={`Min KES ${minDeposit}`}
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 h-14 rounded-2xl font-black text-lg text-white text-center focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                        <Button
                            className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xl rounded-2xl shadow-2xl transition-all active:scale-95 shrink-0"
                            onClick={handleDeposit}
                            disabled={isDepositing}
                        >
                            {isDepositing ? <Loader2 className="h-7 w-7 animate-spin" /> : 'INITIATE DEPOSIT'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-[2.5rem] p-0 overflow-hidden ring-1 ring-white/10 sm:max-w-[420px] max-h-[90vh] flex flex-col">
                    <div className="bg-zinc-900 p-8 sm:p-10 text-center relative border-b border-zinc-800 shrink-0">
                        <TrendingDown className="h-12 w-12 sm:h-16 sm:w-16 text-rose-500 mx-auto mb-4" />
                        <h2 className="text-3xl sm:text-4xl font-black mb-1 tracking-tighter">Cash Out</h2>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Verified Destination</p>
                    </div>
                    <div className="p-8 sm:p-10 space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                            <Input
                                placeholder="M-Pesa Number"
                                value={withdrawPhone}
                                onChange={(e) => setWithdrawPhone(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 h-14 rounded-2xl font-black text-lg text-center focus:ring-2 focus:ring-rose-500/50"
                            />
                            <Input
                                type="number"
                                placeholder="Amount (KES)"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 h-14 rounded-2xl font-black text-lg text-center focus:ring-2 focus:ring-rose-500/50"
                            />
                        </div>
                        <Button
                            className="w-full h-16 bg-white text-black hover:bg-zinc-200 font-black text-xl rounded-2xl transition-all shrink-0"
                            onClick={handleWithdraw}
                            disabled={isWithdrawing}
                        >
                            {isWithdrawing ? <Loader2 className="h-7 w-7 animate-spin text-black" /> : 'CONFIRM PAYOUT'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-[3rem] p-0 overflow-hidden ring-1 ring-white/10 sm:max-w-[480px]">
                    <div className="bg-gradient-to-br from-amber-400 to-yellow-700 p-12 text-center relative">
                        <DollarSign className="h-24 w-24 text-black/20 absolute -right-6 -top-6 rotate-12" />
                        <h2 className="text-5xl font-black text-black tracking-tighter mb-1">KES 20,000</h2>
                        <p className="text-black/70 text-[10px] font-black uppercase tracking-[0.4em]">Ready To Claim</p>
                    </div>
                    <div className="p-10 space-y-8">
                        <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 text-center">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Requirement</p>
                            <p className="text-lg font-bold">Verification Deposit: <span className="text-amber-500 font-black">KES 1,500</span></p>
                        </div>
                        <Input
                            placeholder="Phone Number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 h-16 rounded-2xl font-black text-xl text-center"
                        />
                        <Button
                            className="w-full h-18 bg-amber-500 hover:bg-amber-400 text-black font-black text-2xl rounded-2xl shadow-2xl"
                            onClick={handleGrantUnlock}
                        >
                            ACTIVATE GIFT
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
