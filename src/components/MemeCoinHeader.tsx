import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogOut, User, Rocket, Settings, DollarSign, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export function MemeCoinHeader() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [siteName, setSiteName] = useState('MemeBot Trader');

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('site_name')
        .maybeSingle();
      
      if (data?.site_name) {
        setSiteName(data.site_name);
      }
    };
    fetchSettings();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4 flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <Rocket className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{siteName}</h1>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/trading')} className="text-green-500 hover:text-green-600 font-bold">
                    Trade
                  </Button>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=balances')} className="text-yellow-600 hover:text-yellow-700">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Balances
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                        <Settings className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                    </>
                  )}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{user.email?.split('@')[0]}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                    Login
                  </Button>
                  <Button size="sm" onClick={() => navigate('/auth')}>
                    Sign Up
                  </Button>
                </>
              )}
            </>
          )}
        </nav>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  {siteName}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-3">
                {!loading && (
                  <>
                    {user ? (
                      <>
                        <Button className="w-full" variant="outline" onClick={() => navigate('/trading')}>
                          Trade
                        </Button>
                        {isAdmin && (
                          <>
                            <Button className="w-full" variant="outline" onClick={() => navigate('/admin?tab=balances')}>
                              <DollarSign className="w-4 h-4 mr-2" />
                              Balances
                            </Button>
                            <Button className="w-full" variant="outline" onClick={() => navigate('/admin')}>
                              <Settings className="w-4 h-4 mr-2" />
                              Admin
                            </Button>
                          </>
                        )}
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                          <User className="w-4 h-4" />
                          <span className="text-sm">{user.email?.split('@')[0]}</span>
                        </div>
                        <Button className="w-full" variant="ghost" onClick={handleLogout}>
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button className="w-full" variant="outline" onClick={() => navigate('/auth')}>
                          Login
                        </Button>
                        <Button className="w-full" onClick={() => navigate('/auth')}>
                          Sign Up
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
