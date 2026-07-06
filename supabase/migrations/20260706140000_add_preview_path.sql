-- Add preview_path column to videos and video_files tables
ALTER TABLE public.videos ADD COLUMN preview_path TEXT;
ALTER TABLE public.video_files ADD COLUMN preview_path TEXT;
