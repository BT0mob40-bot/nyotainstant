import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface ChartData {
  time: string;
  price: number;
  volume: number;
}

interface RealisticPriceChartProps {
  memeCoinId: string;
  currentPrice: number;
  volatilityPercent: number;
  tokenSymbol: string;
}

export function RealisticPriceChart({ memeCoinId, currentPrice, volatilityPercent = 2, tokenSymbol }: RealisticPriceChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [livePrice, setLivePrice] = useState(currentPrice);
  const [priceChange, setPriceChange] = useState(0);
  const priceRef = useRef(currentPrice);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate initial historical data
  useEffect(() => {
    const generateHistoricalData = () => {
      const data: ChartData[] = [];
      let price = currentPrice;
      const now = Date.now();
      
      // Generate 24 hours of data points (every 15 minutes = 96 points)
      for (let i = 96; i >= 0; i--) {
        const time = new Date(now - i * 15 * 60 * 1000);
        const volatility = (volatilityPercent / 100) * 0.25; // Scale down for 15-min intervals
        const change = (Math.random() - 0.5) * 2 * volatility;
        price = price * (1 + change);
        price = Math.max(price, currentPrice * 0.5); // Floor at 50% of initial
        price = Math.min(price, currentPrice * 2); // Cap at 200% of initial
        
        data.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          price: price,
          volume: Math.random() * 1000000,
        });
      }
      
      // Set last price to current
      if (data.length > 0) {
        data[data.length - 1].price = currentPrice;
      }
      
      return data;
    };

    setChartData(generateHistoricalData());
    setLivePrice(currentPrice);
    priceRef.current = currentPrice;
  }, [memeCoinId, currentPrice, volatilityPercent]);

  // Real-time price simulation
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const volatility = (volatilityPercent / 100) * 0.05; // Scale for real-time updates
      const change = (Math.random() - 0.5) * 2 * volatility;
      const newPrice = priceRef.current * (1 + change);
      
      // Keep price within reasonable bounds
      const boundedPrice = Math.max(
        Math.min(newPrice, currentPrice * 1.5),
        currentPrice * 0.5
      );
      
      priceRef.current = boundedPrice;
      setLivePrice(boundedPrice);
      
      // Calculate change from initial
      const changePercent = ((boundedPrice - currentPrice) / currentPrice) * 100;
      setPriceChange(changePercent);

      // Add new data point
      setChartData(prev => {
        const now = new Date();
        const newData = [...prev.slice(-95), {
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          price: boundedPrice,
          volume: Math.random() * 1000000,
        }];
        return newData;
      });
    }, 3000); // Update every 3 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [volatilityPercent, currentPrice]);

  // Subscribe to real-time updates from database
  useEffect(() => {
    const channel = supabase
      .channel(`price-updates-${memeCoinId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meme_coins',
          filter: `id=eq.${memeCoinId}`,
        },
        (payload: any) => {
          if (payload.new?.current_price) {
            const newPrice = parseFloat(payload.new.current_price);
            priceRef.current = newPrice;
            setLivePrice(newPrice);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memeCoinId]);

  const formatPrice = (price: number) => {
    if (price < 0.0001) return price.toExponential(4);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  const isPositive = priceChange >= 0;
  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              {tokenSymbol} Price
            </CardTitle>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-3xl font-bold">${formatPrice(livePrice)}</span>
              <Badge 
                variant={isPositive ? 'default' : 'destructive'}
                className={`flex items-center gap-1 ${isPositive ? 'bg-green-500' : ''}`}
              >
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
              </Badge>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>24h High: ${formatPrice(maxPrice)}</div>
            <div>24h Low: ${formatPrice(minPrice)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} 
                    stopOpacity={0.4}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} 
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tickFormatter={(value) => `$${formatPrice(value)}`}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`$${formatPrice(value)}`, 'Price']}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <ReferenceLine 
                y={currentPrice} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="3 3" 
                strokeOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                strokeWidth={2}
                fill="url(#priceGradient)"
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live price updates every 3 seconds • Volatility: {volatilityPercent}%
        </div>
      </CardContent>
    </Card>
  );
}
