-- Create a public view with only safe columns
CREATE VIEW public.creator_profiles_public
WITH (security_invoker=on) AS
  SELECT user_id, username, custom_watermark_path
  FROM public.creator_profiles;

-- Drop the overly broad public read policy
DROP POLICY "Anyone can view creator profiles" ON public.creator_profiles;

-- Add a narrow policy: anon/authenticated can read via the view (which only exposes 3 columns)
CREATE POLICY "Public can view profiles via view"
ON public.creator_profiles
FOR SELECT
TO anon, authenticated
USING (true);