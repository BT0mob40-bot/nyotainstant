import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { WalletConnect } from '@/components/WalletConnect';
import { PortfolioDashboard } from '@/components/PortfolioDashboard';
import { TradingDashboard } from '@/components/TradingDashboard';
import { CryptoMarketplace } from '@/components/CryptoMarketplace';
import { OptionsTrading } from '@/components/OptionsTrading';
import BuyCrypto from '@/components/BuyCrypto';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Zap, Shield, TrendingUp, CreditCard, Wallet, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Zap className="h-8 w-8 text-primary animate-pulse-glow" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <div className="border-b border-border/50 glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg gradient-gold flex items-center justify-center">
                <Zap className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient-gold">
                  CryptoTrade
                </h1>
                <p className="text-xs text-muted-foreground">Trade with M-Pesa</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button asChild variant="outline" className="border-primary/20 hover:bg-primary/10 transition-colors">
                <Link to="/portfolio">
                  Portfolio
                </Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="outline" className="border-primary/20">
                  <Link to="/admin">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout} className="border-border/50">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="buy">
              <CreditCard className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Buy Crypto</span>
              <span className="sm:hidden">Buy</span>
            </TabsTrigger>
            <TabsTrigger value="options">
              <BarChart3 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Options</span>
              <span className="sm:hidden">Options</span>
            </TabsTrigger>
            <TabsTrigger value="trading">
              <TrendingUp className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Trading</span>
              <span className="sm:hidden">Trade</span>
            </TabsTrigger>
            <TabsTrigger value="wallet">
              <Wallet className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Wallet</span>
              <span className="sm:hidden">Wallet</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio">
            <PortfolioDashboard />
          </TabsContent>

          <TabsContent value="buy">
            <CryptoMarketplace />
          </TabsContent>

          <TabsContent value="options">
            <OptionsTrading />
          </TabsContent>

          <TabsContent value="trading">
            <TradingDashboard />
          </TabsContent>

          <TabsContent value="wallet">
            <div className="max-w-2xl mx-auto">
              <WalletConnect />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
