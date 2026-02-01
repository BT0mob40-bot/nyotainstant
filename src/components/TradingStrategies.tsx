import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Play, Pause, Trash2 } from 'lucide-react';
import { CreateStrategyDialog } from './CreateStrategyDialog';

interface Strategy {
  id: string;
  strategy_type: string;
  is_active: boolean;
  buy_threshold: number;
  sell_threshold: number;
  max_investment: number;
}

export const TradingStrategies = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
    } catch (error: any) {
      toast.error('Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  const toggleStrategy = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('trading_strategies')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Strategy ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchStrategies();
    } catch (error: any) {
      toast.error('Failed to update strategy');
    }
  };

  const deleteStrategy = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trading_strategies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Strategy deleted');
      fetchStrategies();
    } catch (error: any) {
      toast.error('Failed to delete strategy');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Trading Strategies</CardTitle>
            <CardDescription>Manage your automated trading strategies</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Strategy
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">Loading strategies...</p>
          ) : strategies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No strategies configured yet</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Strategy
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {strategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold capitalize">{strategy.strategy_type}</h3>
                      <Badge variant={strategy.is_active ? 'default' : 'secondary'}>
                        {strategy.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Buy: {strategy.buy_threshold}% • Sell: {strategy.sell_threshold}% • Max: ${strategy.max_investment}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleStrategy(strategy.id, strategy.is_active)}
                    >
                      {strategy.is_active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteStrategy(strategy.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <CreateStrategyDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={fetchStrategies}
      />
    </>
  );
};