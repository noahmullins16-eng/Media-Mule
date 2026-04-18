
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
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
      SELECT json_agg(row_data ORDER BY created_at DESC)
      FROM (
        SELECT json_build_object(
          'user_id', cp.user_id,
          'email', u.email,
          'tier', cp.tier,
          'storage_used', cp.storage_used,
          'created_at', cp.created_at,
          'video_count', (SELECT COUNT(*) FROM public.videos v WHERE v.user_id = cp.user_id)
        ) as row_data, cp.created_at
        FROM public.creator_profiles cp
        JOIN auth.users u ON u.id = cp.user_id
        ORDER BY cp.created_at DESC
        LIMIT 100
      ) sub
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;
