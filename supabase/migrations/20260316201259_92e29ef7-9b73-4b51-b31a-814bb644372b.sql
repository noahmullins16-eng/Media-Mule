CREATE POLICY "Authenticated can view published videos"
ON public.videos FOR SELECT
TO authenticated
USING (status = 'published');