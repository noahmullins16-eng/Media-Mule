
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: admins can see all roles, users can see their own
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only read policies for creator_profiles (so admin dashboard can see all)
CREATE POLICY "Admins can view all profiles"
  ON public.creator_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only read policy for videos
CREATE POLICY "Admins can view all videos"
  ON public.videos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-assign admin to first user (trigger on user_roles or handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  -- Create creator profile
  INSERT INTO public.creator_profiles (user_id)
  VALUES (NEW.id);
  
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a function for admin analytics
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Only allow admins
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_videos', (SELECT COUNT(*) FROM public.videos),
    'total_storage_used', (SELECT COALESCE(SUM(storage_used), 0) FROM public.creator_profiles),
    'tier_distribution', (
      SELECT json_agg(json_build_object('tier', tier, 'count', cnt))
      FROM (SELECT tier, COUNT(*) as cnt FROM public.creator_profiles GROUP BY tier) t
    ),
    'recent_users', (
      SELECT json_agg(json_build_object(
        'user_id', cp.user_id,
        'tier', cp.tier,
        'storage_used', cp.storage_used,
        'created_at', cp.created_at,
        'video_count', (SELECT COUNT(*) FROM public.videos v WHERE v.user_id = cp.user_id)
      ) ORDER BY cp.created_at DESC)
      FROM public.creator_profiles cp
      LIMIT 100
    )
  ) INTO result;
  
  RETURN result;
END;
$$;
