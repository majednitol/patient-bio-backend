
-- Research sharing preferences per patient
CREATE TABLE public.research_sharing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  share_vitals BOOLEAN DEFAULT true,
  share_prescriptions BOOLEAN DEFAULT true,
  share_lab_results BOOLEAN DEFAULT true,
  share_diagnoses BOOLEAN DEFAULT true,
  share_demographics BOOLEAN DEFAULT true,
  share_allergies BOOLEAN DEFAULT true,
  require_anonymization BOOLEAN DEFAULT true,
  notify_new_requests BOOLEAN DEFAULT true,
  notify_auto_approved BOOLEAN DEFAULT true,
  notify_earnings BOOLEAN DEFAULT true,
  notification_frequency TEXT DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.research_sharing_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research preferences"
  ON public.research_sharing_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research preferences"
  ON public.research_sharing_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own research preferences"
  ON public.research_sharing_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_research_sharing_preferences_updated_at
  BEFORE UPDATE ON public.research_sharing_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
