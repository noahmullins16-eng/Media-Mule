
-- Add accumulated fees tracking to creator_profiles
ALTER TABLE public.creator_profiles ADD COLUMN accumulated_fees numeric NOT NULL DEFAULT 0;

-- Create fee_upgrades table to track free Basic months granted
CREATE TABLE public.fee_upgrades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  accumulated_fees_at_grant numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_upgrades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fee upgrades"
  ON public.fee_upgrades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert fee upgrades"
  ON public.fee_upgrades FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Service role can manage fee upgrades"
  ON public.fee_upgrades FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
