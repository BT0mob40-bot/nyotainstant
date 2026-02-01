import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  Zap,
  TrendingUp,
  Shield,
  Smartphone,
  ArrowRight,
  Rocket,
  Users,
  BarChart3,
  Coins
} from 'lucide-react';

interface SiteSettings {
  site_name: string;
  site_tagline: string;
  site_logo_url: string | null;
}

interface FeaturedCoin {
  id: string;
  token_name: string;
  token_symbol: string;
  image_url: string;
  current_price: number;
  market_cap: number;
  holder_count: number;
}

export default function Landing() {
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: 'MemeBot Trader',
    site_tagline: 'Your Gateway to Meme Coin Trading',
    site_logo_url: null,
  });
  const [featuredCoins, setFeaturedCoins] = useState<FeaturedCoin[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchFeaturedCoins();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setSettings(data as SiteSettings);
    }
  };

  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const fetchFeaturedCoins = async () => {
    const { data } = await supabase
      .from('meme_coins')
      .select('id, token_name, token_symbol, image_url, current_price, market_cap, holder_count')
      .eq('is_active', true)
      .eq('is_featured', true)
      .limit(3);

    if (data) {
      setFeaturedCoins(data);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const features = [
    {
      icon: Smartphone,
      title: 'M-Pesa Integration',
      description: 'Buy crypto instantly using M-Pesa. No bank account needed.',
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Trading',
      description: 'Watch prices move in real-time with live market data.',
    },
    {
      icon: Shield,
      title: 'Secure Platform',
      description: 'Your funds are protected with industry-leading security.',
    },
    {
      icon: Rocket,
      title: 'Early Access',
      description: 'Get in early on the next big meme coins before they moon.',
    },
  ];

  const stats = [
    { label: 'Active Traders', value: '10K+', icon: Users },
    { label: 'Total Volume', value: '$5M+', icon: BarChart3 },
    { label: 'Listed Coins', value: '50+', icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.site_logo_url ? (
                <img src={settings.site_logo_url} alt={settings.site_name} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
              )}
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {settings.site_name}
              </span>
            </div>
            <div className="flex gap-3">
              {user && (
                <Button variant="ghost" asChild>
                  <Link to="/trading">Trading</Link>
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate('/portfolio')}>Explore</Button>
              <Button onClick={() => {
                if (user) {
                  if (isAdmin) navigate('/admin');
                  else navigate('/trading');
                } else {
                  navigate('/auth');
                }
              }}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Now with M-Pesa Integration</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                Trade Meme Coins
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                The Easy Way
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {settings.site_tagline}. Buy crypto with M-Pesa, track real-time prices, and join the meme coin revolution.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" onClick={() => {
                if (user) {
                  if (isAdmin) navigate('/admin');
                  else navigate('/');
                } else {
                  navigate('/auth');
                }
              }}>
                <Smartphone className="mr-2 h-5 w-5" />
                Start Trading
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8">
                <Link to="/trading">
                  View Coins
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <stat.icon className="h-6 w-6 text-primary" />
                  <span className="text-3xl md:text-4xl font-bold">{stat.value}</span>
                </div>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Us?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We make meme coin trading accessible to everyone, especially with local payment methods.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Coins */}
      {featuredCoins.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Coins</h2>
              <p className="text-muted-foreground text-lg">Hot picks selected by our team</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {featuredCoins.map((coin) => (
                <Link to={`/meme/${coin.id}`} key={coin.id}>
                  <Card className="hover:shadow-xl hover:border-primary/50 transition-all duration-300 group">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4 mb-4">
                        {coin.image_url ? (
                          <img
                            src={coin.image_url}
                            alt={coin.token_name}
                            className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-2xl font-bold">
                            {coin.token_symbol.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="text-xl font-bold">{coin.token_symbol}</h3>
                          <p className="text-muted-foreground text-sm">{coin.token_name}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Market Cap</p>
                          <p className="font-semibold">{formatNumber(coin.market_cap)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Holders</p>
                          <p className="font-semibold">{coin.holder_count}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button variant="outline" size="lg" asChild>
                <Link to="/trading">
                  View All Coins
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-primary/20">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Trading?</h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Join thousands of traders using M-Pesa to buy and sell meme coins. Get started in minutes.
              </p>
              <Button size="lg" asChild className="text-lg px-8">
                <Link to="/auth">
                  <Rocket className="mr-2 h-5 w-5" />
                  Create Free Account
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {settings.site_logo_url ? (
                <img src={settings.site_logo_url} alt={settings.site_name} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <span className="font-semibold">{settings.site_name}</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} {settings.site_name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
