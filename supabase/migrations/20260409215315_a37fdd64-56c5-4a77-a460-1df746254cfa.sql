
ALTER TABLE public.media_folders
ADD COLUMN parent_folder_id uuid REFERENCES public.media_folders(id) ON DELETE CASCADE DEFAULT NULL;

CREATE INDEX idx_media_folders_parent ON public.media_folders(parent_folder_id);
