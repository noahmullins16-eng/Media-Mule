
-- Create video_files table for bundle support
CREATE TABLE public.video_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'video',
  file_size bigint,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_files ENABLE ROW LEVEL SECURITY;

-- RLS policies: same access pattern as videos
CREATE POLICY "Anyone can view files of published videos"
  ON public.video_files FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.videos WHERE videos.id = video_files.video_id AND videos.status = 'published'));

CREATE POLICY "Authenticated can view files of published videos"
  ON public.video_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.videos WHERE videos.id = video_files.video_id AND videos.status = 'published'));

CREATE POLICY "Users can view own video files"
  ON public.video_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.videos WHERE videos.id = video_files.video_id AND videos.user_id = auth.uid()));

CREATE POLICY "Users can insert own video files"
  ON public.video_files FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.videos WHERE videos.id = video_files.video_id AND videos.user_id = auth.uid()));

CREATE POLICY "Users can delete own video files"
  ON public.video_files FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.videos WHERE videos.id = video_files.video_id AND videos.user_id = auth.uid()));

-- Migrate existing video file_path data into video_files
INSERT INTO public.video_files (video_id, file_path, file_type, file_size, sort_order)
SELECT id, file_path, 'video', file_size, 0 FROM public.videos WHERE file_path IS NOT NULL AND file_path != '';
