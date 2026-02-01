import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { PortfolioDashboard } from '@/components/PortfolioDashboard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function Portfolio() {
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
                <p className="text-xs text-muted-foreground">Portfolio</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button asChild variant="default" className="bg-green-500 hover:bg-green-600 border-none shadow-lg hover:shadow-xl transition-all">
                <Link to="/trading">
                  Trade
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

      {/* Portfolio Content */}
      <div className="container mx-auto px-4 py-8">
        <PortfolioDashboard />
      </div>
    </div>
  );
}