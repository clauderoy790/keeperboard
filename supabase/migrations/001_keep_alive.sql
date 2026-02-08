-- Keep-alive function for preventing Supabase free-tier pause
-- Called by GitHub Actions cron job every 3 days

CREATE OR REPLACE FUNCTION public.keep_alive()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 'ok';
END;
$$;

-- Allow anon role to call it (needed for the API call)
GRANT EXECUTE ON FUNCTION public.keep_alive() TO anon;
