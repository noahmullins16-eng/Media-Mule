-- Drop and recreate view without security_invoker (so it bypasses RLS as view owner)
DROP VIEW IF EXISTS public.creator_profiles_public;

CREATE VIEW public.creator_profiles_public AS
  SELECT user_id, username, custom_watermark_path
  FROM public.creator_profiles;

-- Grant access on the view to anon and authenticated
GRANT SELECT ON public.creator_profiles_public TO anon, authenticated;

-- Remove the broad public SELECT policy from the base table
DROP POLICY IF EXISTS "Public can view profiles via view" ON public.creator_profiles;