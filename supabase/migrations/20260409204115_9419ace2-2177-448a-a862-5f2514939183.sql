CREATE POLICY "Anyone can view creator profiles"
ON public.creator_profiles
FOR SELECT
TO anon, authenticated
USING (true);