
-- RPC to get active user counts by time window, avoiding fetching all rows client-side
CREATE OR REPLACE FUNCTION public.get_active_user_counts()
RETURNS TABLE (
  hourly_active BIGINT,
  daily_active BIGINT,
  weekly_active BIGINT,
  monthly_active BIGINT,
  total_users BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM access_logs WHERE accessed_at >= now() - interval '1 hour'),
    (SELECT COUNT(DISTINCT user_id) FROM access_logs WHERE accessed_at >= now() - interval '1 day'),
    (SELECT COUNT(DISTINCT user_id) FROM access_logs WHERE accessed_at >= now() - interval '7 days'),
    (SELECT COUNT(DISTINCT user_id) FROM access_logs WHERE accessed_at >= now() - interval '30 days'),
    (SELECT COUNT(*) FROM user_profiles);
$$;

-- RPC to get recent access log count for system health (last 24h)
CREATE OR REPLACE FUNCTION public.get_recent_access_count()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*) FROM access_logs WHERE accessed_at >= now() - interval '1 day';
$$;
