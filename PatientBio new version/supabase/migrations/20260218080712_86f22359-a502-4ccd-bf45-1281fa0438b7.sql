
-- Create health_score_snapshots table for weekly score history
CREATE TABLE public.health_score_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '{}',
  tracked_types INTEGER DEFAULT 0,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.health_score_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can read their own snapshots
CREATE POLICY "Users can read own score snapshots"
  ON public.health_score_snapshots FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own snapshots
CREATE POLICY "Users can insert own score snapshots"
  ON public.health_score_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_health_score_snapshots_user_date 
  ON public.health_score_snapshots (user_id, snapshot_date DESC);
