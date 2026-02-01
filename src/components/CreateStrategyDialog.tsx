import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateStrategyDialog = ({ open, onOpenChange, onSuccess }: CreateStrategyDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    strategy_type: 'frequency',
    buy_threshold: '2',
    sell_threshold: '5',
    max_investment: '100',
    stop_loss: '10',
    take_profit: '20',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // For now, we'll use a dummy token_id. In production, you'd select from available tokens
      const { data: tokens } = await supabase
        .from('trading_tokens')
        .select('id')
        .limit(1)
        .single();

      if (!tokens) {
        toast.error('No trading tokens available. Admin needs to add tokens first.');
        return;
      }

      const { error } = await supabase
        .from('trading_strategies')
        .insert({
          user_id: user.id,
          token_id: tokens.id,
          strategy_type: formData.strategy_type,
          buy_threshold: parseFloat(formData.buy_threshold),
          sell_threshold: parseFloat(formData.sell_threshold),
          max_investment: parseFloat(formData.max_investment),
          stop_loss: parseFloat(formData.stop_loss),
          take_profit: parseFloat(formData.take_profit),
        });

      if (error) throw error;

      toast.success('Strategy created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create strategy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Trading Strategy</DialogTitle>
          <DialogDescription>
            Configure your automated trading parameters
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="strategy_type">Strategy Type</Label>
            <Select
              value={formData.strategy_type}
              onValueChange={(value) => setFormData({ ...formData, strategy_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frequency">Frequency Trading</SelectItem>
                <SelectItem value="momentum">Momentum Trading</SelectItem>
                <SelectItem value="scalping">Scalping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buy_threshold">Buy Threshold (%)</Label>
              <Input
                id="buy_threshold"
                type="number"
                step="0.1"
                value={formData.buy_threshold}
                onChange={(e) => setFormData({ ...formData, buy_threshold: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sell_threshold">Sell Threshold (%)</Label>
              <Input
                id="sell_threshold"
                type="number"
                step="0.1"
                value={formData.sell_threshold}
                onChange={(e) => setFormData({ ...formData, sell_threshold: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_investment">Max Investment ($)</Label>
            <Input
              id="max_investment"
              type="number"
              step="0.01"
              value={formData.max_investment}
              onChange={(e) => setFormData({ ...formData, max_investment: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stop_loss">Stop Loss (%)</Label>
              <Input
                id="stop_loss"
                type="number"
                step="0.1"
                value={formData.stop_loss}
                onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="take_profit">Take Profit (%)</Label>
              <Input
                id="take_profit"
                type="number"
                step="0.1"
                value={formData.take_profit}
                onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Strategy'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};