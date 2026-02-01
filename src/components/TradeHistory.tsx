import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface Trade {
  id: string;
  trade_type: string;
  amount: number;
  price: number;
  total_value: number;
  status: string;
  created_at: string;
}

export const TradeHistory = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTrades(data || []);
    } catch (error: any) {
      toast.error('Failed to load trade history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
        <CardDescription>Your recent trading activity</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground">Loading trades...</p>
        ) : trades.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No trades yet</p>
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    trade.trade_type === 'buy' 
                      ? 'bg-accent/10 text-accent' 
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {trade.trade_type === 'buy' ? (
                      <ArrowDownRight className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{trade.trade_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {trade.amount.toFixed(8)} @ ${trade.price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${trade.total_value.toFixed(2)}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      trade.status === 'completed' ? 'default' :
                      trade.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {trade.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatDistance(new Date(trade.created_at), new Date(), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};