CREATE POLICY "Anyone can view video files via signed URL"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'videos');