
-- Add custom watermark path to creator profiles
ALTER TABLE public.creator_profiles ADD COLUMN custom_watermark_path text DEFAULT NULL;

-- Create watermarks storage bucket (public so watermark images can be displayed)
INSERT INTO storage.buckets (id, name, public) VALUES ('watermarks', 'watermarks', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own watermarks"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'watermarks' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own watermarks
CREATE POLICY "Users can update own watermarks"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'watermarks' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own watermarks
CREATE POLICY "Users can delete own watermarks"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'watermarks' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view watermarks (they're displayed on videos)
CREATE POLICY "Anyone can view watermarks"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'watermarks');
