-- Create function to increment broadcast approvals
CREATE OR REPLACE FUNCTION public.increment_broadcast_approvals(broadcast_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE research_broadcast_requests
  SET patients_approved = patients_approved + 1,
      updated_at = now()
  WHERE id = broadcast_id;
END;
$$;

-- Create function to increment broadcast rejections
CREATE OR REPLACE FUNCTION public.increment_broadcast_rejections(broadcast_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE research_broadcast_requests
  SET patients_rejected = patients_rejected + 1,
      updated_at = now()
  WHERE id = broadcast_id;
END;
$$;