import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CreateMemeCoin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    twitter: '',
    telegram: '',
    website: '',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please login to create a meme coin',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Validation
    if (!formData.name.trim() || !formData.symbol.trim()) {
      toast({
        title: 'Missing information',
        description: 'Token name and symbol are required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.symbol.length < 2 || formData.symbol.length > 10) {
      toast({
        title: 'Invalid symbol',
        description: 'Symbol must be between 2-10 characters',
        variant: 'destructive',
      });
      return;
    }

    if (!imageFile) {
      toast({
        title: 'Image required',
        description: 'Please upload a token image',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const imageUrl = reader.result as string;

          // Call edge function to create meme coin
          const { data, error } = await supabase.functions.invoke('create-meme-coin', {
            body: {
              name: formData.name.trim(),
              symbol: formData.symbol.trim().toUpperCase(),
              description: formData.description.trim() || null,
              imageUrl,
              twitterUrl: formData.twitter.trim() || null,
              telegramUrl: formData.telegram.trim() || null,
              websiteUrl: formData.website.trim() || null,
            },
          });

          if (error) throw error;

          toast({
            title: 'Meme coin created! 🚀',
            description: `${formData.symbol} is now live on the bonding curve`,
          });

          // Redirect to the newly created coin
          if (data?.memeCoin?.id) {
            navigate(`/meme/${data.memeCoin.id}`);
          } else {
            navigate('/');
          }
        } catch (error: any) {
          console.error('Error creating meme coin:', error);
          toast({
            title: 'Failed to create meme coin',
            description: error.message || 'Something went wrong',
            variant: 'destructive',
          });
          setLoading(false);
        }
      };
      reader.readAsDataURL(imageFile);
    } catch (error: any) {
      console.error('Error creating meme coin:', error);
      toast({
        title: 'Failed to create meme coin',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create a Meme Coin</CardTitle>
        <CardDescription>
          Launch your own token with a fair bonding curve. No presales, no team allocation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="image">Token Image *</Label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                    <Upload className="mx-auto mb-2" />
                    <span className="text-sm">Click to upload image</span>
                  </div>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Doge Coin"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Token Symbol *</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                placeholder="DOGE"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell us about your meme coin..."
              rows={4}
            />
          </div>

          <div className="space-y-4">
            <Label>Social Links (Optional)</Label>
            <div className="space-y-2">
              <Input
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                placeholder="Twitter URL"
              />
              <Input
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                placeholder="Telegram URL"
              />
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="Website URL"
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-semibold">Bonding Curve Details</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Total Supply: 1,000,000,000 tokens</li>
              <li>• Starting Price: 0.0001 SOL per token</li>
              <li>• Graduation Threshold: 85 SOL</li>
              <li>• Fair Launch: No presales or team allocation</li>
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !user}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Token...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Create Meme Coin
              </>
            )}
          </Button>

          {!user && (
            <p className="text-sm text-center text-muted-foreground">
              Please login to create a meme coin
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}