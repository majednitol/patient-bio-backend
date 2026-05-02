-- Enable realtime for core patient data tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_metrics;