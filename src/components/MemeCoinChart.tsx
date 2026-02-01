import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface ChartData {
  time: string;
  price: number;
}

interface MemeCoinChartProps {
  memeCoinId: string;
  currentPrice?: number;
}

export function MemeCoinChart({ memeCoinId, currentPrice }: MemeCoinChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    fetchChartData();

    // Subscribe to new trades for real-time updates
    const channel = supabase
      .channel(`chart-${memeCoinId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meme_coin_trades',
          filter: `meme_coin_id=eq.${memeCoinId}`,
        },
        () => {
          fetchChartData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memeCoinId]);

  const generateSimulatedData = (price: number) => {
    const points = 50;
    const data: ChartData[] = [];
    const now = new Date();
    let current = price;
    
    // Generate backwards from now
    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 15 * 60000); // 15 min intervals
      // Random walk with mean reversion to price
      const change = (Math.random() - 0.5) * (price * 0.05); // 5% volatility
      const trend = (price - current) * 0.1; // Pull towards current price
      
      // For the last point (now), use exact current price
      if (i === 0) {
        current = price;
      } else {
        current = current + change + trend;
      }
      
      // Ensure positive price
      current = Math.max(0.00000001, current);

      data.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: current
      });
    }
    return data;
  };

  const fetchChartData = async () => {
    try {
      const { data, error } = await supabase
        .from('meme_coin_trades')
        .select('price_per_token, created_at')
        .eq('meme_coin_id', memeCoinId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        if (currentPrice) {
          setChartData(generateSimulatedData(currentPrice));
        }
        return;
      }

      const formatted = data.map((trade) => ({
        time: new Date(trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: parseFloat(trade.price_per_token.toString()),
      }));

      setChartData(formatted);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => value.toFixed(6)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value.toFixed(6)} SOL`, 'Price']}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}