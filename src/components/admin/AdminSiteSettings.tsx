import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings, Globe, ImageIcon, Save, Loader2 } from 'lucide-react';

interface SiteSettings {
  id: string;
  site_name: string;
  site_logo_url: string | null;
  site_tagline: string | null;
  primary_color: string | null;
}

export function AdminSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    site_name: 'MemeBot Trader',
    site_logo_url: '',
    site_tagline: 'Your Gateway to Meme Coin Trading',
    primary_color: '#a855f7',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data as SiteSettings);
        setFormData({
          site_name: data.site_name || 'MemeBot Trader',
          site_logo_url: data.site_logo_url || '',
          site_tagline: data.site_tagline || 'Your Gateway to Meme Coin Trading',
          primary_color: data.primary_color || '#a855f7',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('site_settings')
          .update({
            site_name: formData.site_name,
            site_logo_url: formData.site_logo_url || null,
            site_tagline: formData.site_tagline,
            primary_color: formData.primary_color,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert({
            site_name: formData.site_name,
            site_logo_url: formData.site_logo_url || null,
            site_tagline: formData.site_tagline,
            primary_color: formData.primary_color,
          });

        if (error) throw error;
      }

      toast.success('Site settings updated successfully!');
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Site Settings</h2>
        <p className="text-muted-foreground">Customize your platform branding</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>Configure your site name and tagline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input
                value={formData.site_name}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                placeholder="MemeBot Trader"
              />
              <p className="text-xs text-muted-foreground">
                This will appear in the header, auth pages, and footer
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={formData.site_tagline}
                onChange={(e) => setFormData({ ...formData, site_tagline: e.target.value })}
                placeholder="Your Gateway to Meme Coin Trading"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Logo
            </CardTitle>
            <CardDescription>Upload your site logo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={formData.site_logo_url}
                onChange={(e) => setFormData({ ...formData, site_logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>

            {formData.site_logo_url && (
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                  <img
                    src={formData.site_logo_url}
                    alt="Logo preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Logo preview</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Theme Color
            </CardTitle>
            <CardDescription>Primary brand color</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="#a855f7"
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
