-- Create research_broadcast_requests table to track broadcast requests from researchers
CREATE TABLE public.research_broadcast_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID NOT NULL,
  disease_category TEXT NOT NULL,
  research_purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  patients_notified INTEGER DEFAULT 0,
  patients_approved INTEGER DEFAULT 0,
  patients_rejected INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add broadcast_request_id column to data_access_requests
ALTER TABLE public.data_access_requests 
ADD COLUMN broadcast_request_id UUID REFERENCES public.research_broadcast_requests(id) ON DELETE SET NULL;

-- Enable RLS on research_broadcast_requests
ALTER TABLE public.research_broadcast_requests ENABLE ROW LEVEL SECURITY;

-- Researchers can view their own broadcast requests
CREATE POLICY "Researchers can view own broadcast requests"
  ON public.research_broadcast_requests
  FOR SELECT
  USING (auth.uid() = researcher_id);

-- Researchers can create broadcast requests
CREATE POLICY "Researchers can create broadcast requests"
  ON public.research_broadcast_requests
  FOR INSERT
  WITH CHECK (auth.uid() = researcher_id);

-- Researchers can update their own broadcast requests (cancel)
CREATE POLICY "Researchers can update own broadcast requests"
  ON public.research_broadcast_requests
  FOR UPDATE
  USING (auth.uid() = researcher_id);

-- Create index for faster lookups
CREATE INDEX idx_broadcast_requests_researcher ON public.research_broadcast_requests(researcher_id);
CREATE INDEX idx_broadcast_requests_status ON public.research_broadcast_requests(status);
CREATE INDEX idx_data_access_requests_broadcast ON public.data_access_requests(broadcast_request_id);