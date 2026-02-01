import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettings {
  site_name: string;
  site_logo_url: string | null;
  site_tagline: string | null;
  primary_color: string | null;
}

const defaultSettings: SiteSettings = {
  site_name: 'MemeBot Trader',
  site_logo_url: null,
  site_tagline: 'Your Gateway to Meme Coin Trading',
  primary_color: '#a855f7',
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .limit(1)
          .single();

        if (data && !error) {
          setSettings({
            site_name: data.site_name || defaultSettings.site_name,
            site_logo_url: data.site_logo_url,
            site_tagline: data.site_tagline,
            primary_color: data.primary_color,
          });
        }
      } catch (error) {
        console.error('Error fetching site settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel('site-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => fetchSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading };
}
