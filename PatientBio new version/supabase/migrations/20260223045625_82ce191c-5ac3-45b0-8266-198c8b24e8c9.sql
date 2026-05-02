ALTER TABLE public.sample_tracking_events
ADD CONSTRAINT sample_tracking_events_performed_by_fkey
FOREIGN KEY (performed_by) REFERENCES public.user_profiles(user_id);