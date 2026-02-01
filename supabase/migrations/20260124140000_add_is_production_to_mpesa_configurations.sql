'Accessconst { data: sessionData } = await supabase.auth.getSession();
const accessToken = sessionData?.session?.access_token;