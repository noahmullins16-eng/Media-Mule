
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  buyer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email TEXT NOT NULL,
  seller_user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own purchases"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Sellers can view sales"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_user_id);

CREATE POLICY "Service role can insert purchases"
  ON public.purchases FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can view all purchases"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
