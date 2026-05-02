
-- Add composite index for user-scoped queries (patient dashboard)
CREATE INDEX IF NOT EXISTS idx_access_logs_user_accessed 
ON public.access_logs (user_id, accessed_at DESC);

-- Add index for admin time-range queries
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at 
ON public.access_logs (accessed_at DESC);

-- Add index for accessor_type filtering
CREATE INDEX IF NOT EXISTS idx_access_logs_accessor_type 
ON public.access_logs (accessor_type, accessed_at DESC);

-- Optimize get_active_user_counts() to scan the table ONCE instead of 4 times
CREATE OR REPLACE FUNCTION public.get_active_user_counts()
 RETURNS TABLE(hourly_active bigint, daily_active bigint, weekly_active bigint, monthly_active bigint, total_users bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH recent_access AS (
    SELECT DISTINCT user_id, accessed_at
    FROM access_logs
    WHERE accessed_at >= now() - interval '30 days'
  )
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM recent_access WHERE accessed_at >= now() - interval '1 hour'),
    (SELECT COUNT(DISTINCT user_id) FROM recent_access WHERE accessed_at >= now() - interval '1 day'),
    (SELECT COUNT(DISTINCT user_id) FROM recent_access WHERE accessed_at >= now() - interval '7 days'),
    (SELECT COUNT(DISTINCT user_id) FROM recent_access),
    (SELECT COUNT(*) FROM user_profiles);
$function$;
