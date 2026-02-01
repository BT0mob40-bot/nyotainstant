import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Plus, Trash2, CheckCircle, XCircle, Info, ExternalLink, AlertCircle } from 'lucide-react';

interface MpesaConfig {
  id: string;
  payment_type: string;
  consumer_key: string;
  consumer_secret: string;
  shortcode: string;
  passkey: string;
  paybill_number: string | null;
  account_reference: string | null;
  is_active: boolean;
  created_at: string;
}

const MpesaSettings = () => {
  const [configs, setConfigs] = useState<MpesaConfig[]>([]);
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [shortcode, setShortcode] = useState('');
  const [passkey, setPasskey] = useState('');
  const [isProduction, setIsProduction] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    const { data, error } = await supabase
      .from('mpesa_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching configs:', error);
    } else {
      setConfigs(data || []);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('mpesa_configurations')
        .insert({
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          shortcode,
          passkey,
          is_production: isProduction,
        });

      if (error) throw error;

      toast.success('M-Pesa configuration saved successfully!');
      
      // Reset form
      setConsumerKey('');
      setConsumerSecret('');
      setShortcode('');
      setPasskey('');
      setIsProduction(false);
      
      fetchConfigs();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const toggleConfigStatus = async (id: string, currentStatus: boolean) => {
    // First, deactivate all configs
    await supabase
      .from('mpesa_configurations')
      .update({ is_active: false })
      .neq('id', id);

    // Then activate the selected one
    const { error } = await supabase
      .from('mpesa_configurations')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update configuration status');
    } else {
      toast.success('Configuration status updated');
      fetchConfigs();
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const { error } = await supabase
        .from('mpesa_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Configuration deleted successfully');
      fetchConfigs();
    } catch (error: any) {
      console.error('Error deleting config:', error);
      toast.error(error.message || 'Failed to delete configuration');
    }
  };

  const fillTestCredentials = () => {
    // Safaricom sandbox test credentials
    setConsumerKey('');
    setConsumerSecret('');
    setShortcode('174379'); // Sandbox shortcode
    setPasskey('bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'); // Sandbox passkey
    setPaybillNumber('174379');
    setAccountReference('TestPurchase');
    toast.info('Sandbox credentials template loaded. Add your Consumer Key/Secret from Daraja Portal.');
  };

  return (
    <div className="space-y-6">
      {/* Documentation Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            M-Pesa Express (STK Push) Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="how-it-works">
              <AccordionTrigger className="text-sm">How M-Pesa STK Push Works</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong>Lipa Na M-Pesa Online (STK Push)</strong> allows you to initiate a payment request directly to a customer's phone.</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Customer enters phone number and amount</li>
                  <li>System sends STK Push request to Safaricom</li>
                  <li>Customer receives a prompt on their phone</li>
                  <li>Customer enters M-Pesa PIN to authorize</li>
                  <li>Safaricom sends callback with payment result</li>
                  <li>Tokens are allocated upon successful payment</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="get-credentials">
              <AccordionTrigger className="text-sm">Getting Daraja API Credentials</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Go to <a href="https://developer.safaricom.co.ke" target="_blank" rel="noopener" className="text-primary underline">developer.safaricom.co.ke</a></li>
                  <li>Create an account and login</li>
                  <li>Create a new app and select "Lipa Na M-Pesa Sandbox" or "Lipa Na M-Pesa Online"</li>
                  <li>Copy your <strong>Consumer Key</strong> and <strong>Consumer Secret</strong></li>
                  <li>For production, apply for "Go Live" and get your Shortcode and Passkey</li>
                </ol>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => window.open('https://developer.safaricom.co.ke', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Daraja Portal
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="paybill-vs-till">
              <AccordionTrigger className="text-sm">Paybill vs Buy Goods (Till)</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Paybill</p>
                    <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                      <li>Uses CustomerPayBillOnline</li>
                      <li>Requires Account Reference</li>
                      <li>Good for businesses with account numbers</li>
                    </ul>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Buy Goods (Till)</p>
                    <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                      <li>Uses CustomerBuyGoodsOnline</li>
                      <li>Simpler setup</li>
                      <li>Good for retail/simple payments</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add M-Pesa Configuration</CardTitle>
              <CardDescription>
                Configure M-Pesa Daraja API credentials for STK Push payments
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={fillTestCredentials}>
              Use Sandbox Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-2">
              <Label>Configuration Type</Label>
              <div className="text-sm text-muted-foreground">This project uses PayBill (shortcode) configurations only.</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="isProduction">Production Mode</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="isProduction"
                    type="checkbox"
                    checked={isProduction}
                    onChange={e => setIsProduction(e.target.checked)}
                  />
                  <span className="text-xs text-muted-foreground">Use live Safaricom API (uncheck for sandbox)</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumerKey">Consumer Key *</Label>
                <Input
                  id="consumerKey"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="From Daraja Portal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumerSecret">Consumer Secret *</Label>
                <Input
                  id="consumerSecret"
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="From Daraja Portal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortcode">Business Shortcode *</Label>
                <Input
                  id="shortcode"
                  value={shortcode}
                  onChange={(e) => setShortcode(e.target.value)}
                  placeholder="e.g., 174379 (sandbox) or your shortcode"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Sandbox: 174379 | Production: Your assigned shortcode
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passkey">Lipa Na M-Pesa Passkey *</Label>
                <Input
                  id="passkey"
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="From Safaricom"
                  required
                />
              </div>

              {/* Account reference is provided at purchase time (token name). No static account reference here. */}
            </div>

            <Button type="submit" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Add Configuration'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Configurations */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Configurations</CardTitle>
          <CardDescription>Manage your M-Pesa API configurations. Only one can be active at a time.</CardDescription>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No configurations yet. Add one above to enable M-Pesa payments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <div 
                  key={config.id} 
                  className={`p-4 border rounded-lg transition-colors ${config.is_active ? 'border-green-500 bg-green-500/5' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {config.is_active ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium capitalize flex items-center gap-2">
                          {config.payment_type === 'paybill' ? 'Pay Bill' : 'Buy Goods'}
                          {config.is_active && <Badge className="bg-green-500">Active</Badge>}
                        </p>
                        <p className="text-sm text-muted-foreground">Shortcode: {config.shortcode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${config.id}`} className="text-sm">Active</Label>
                        <Switch
                          id={`active-${config.id}`}
                          checked={config.is_active}
                          onCheckedChange={() => toggleConfigStatus(config.id, config.is_active)}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteConfig(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Shortcode:</span> {config.shortcode}
                    </div>
                    <div>
                      <span className="font-medium">Production:</span> {config.is_production ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(config.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MpesaSettings;
