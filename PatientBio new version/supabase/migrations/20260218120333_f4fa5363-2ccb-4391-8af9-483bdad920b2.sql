-- Enable realtime for researcher collaboration tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_researcher_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.research_broadcast_requests;