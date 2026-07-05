-- Create upload_sessions table to track active uploads and rate limit
CREATE TABLE IF NOT EXISTS public.upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  upload_id text NOT NULL,
  file_key text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  chunk_size integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  aborted_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

-- Owner can view and modify their own sessions
CREATE POLICY "Users can do all on own upload sessions"
  ON public.upload_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS upload_sessions_user_id_created_at_idx ON public.upload_sessions(user_id, created_at);
