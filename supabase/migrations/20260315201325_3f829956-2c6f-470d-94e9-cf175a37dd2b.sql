
CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  page_path text NOT NULL DEFAULT '/',
  visited_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Allow anonymous inserts for visitor tracking
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visits" ON public.site_visits
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all visits" ON public.site_visits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for efficient unique visitor queries
CREATE INDEX idx_site_visits_visitor_id ON public.site_visits(visitor_id);
CREATE INDEX idx_site_visits_visited_at ON public.site_visits(visited_at);
