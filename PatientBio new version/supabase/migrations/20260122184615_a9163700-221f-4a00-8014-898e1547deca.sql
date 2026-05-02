-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  profile_image_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  email TEXT,
  is_advisor BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  gradient TEXT DEFAULT 'from-primary to-secondary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (team info is public)
CREATE POLICY "Team members are viewable by everyone" 
ON public.team_members 
FOR SELECT 
USING (true);

-- Create policy for authenticated users to manage team members
CREATE POLICY "Authenticated users can insert team members" 
ON public.team_members 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update team members" 
ON public.team_members 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete team members" 
ON public.team_members 
FOR DELETE 
TO authenticated
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for team profile images
INSERT INTO storage.buckets (id, name, public) VALUES ('team-profiles', 'team-profiles', true);

-- Create storage policies for team profile images
CREATE POLICY "Team profile images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'team-profiles');

CREATE POLICY "Authenticated users can upload team profile images" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'team-profiles');

CREATE POLICY "Authenticated users can update team profile images" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'team-profiles');

CREATE POLICY "Authenticated users can delete team profile images" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'team-profiles');

-- Insert default team members
INSERT INTO public.team_members (name, role, bio, linkedin_url, twitter_url, is_advisor, display_order, gradient) VALUES
('Dr. Sarah Chen', 'CEO & Co-Founder', 'Former Chief Medical Officer at Stanford Health. 15+ years in healthcare innovation.', NULL, NULL, false, 1, 'from-primary to-secondary'),
('Michael Rodriguez', 'CTO & Co-Founder', 'Ex-Google engineer. Built security systems for Fortune 500 healthcare companies.', NULL, NULL, false, 2, 'from-secondary to-accent'),
('Dr. Emily Park', 'Chief Medical Advisor', 'Board-certified physician with expertise in health informatics and patient advocacy.', NULL, NULL, false, 3, 'from-accent to-primary'),
('James Thompson', 'VP of Engineering', 'Former Amazon engineer. Specialist in distributed systems and data security.', NULL, NULL, false, 4, 'from-primary to-secondary'),
('Lisa Wang', 'Head of Product', 'Previously at Stripe and Oscar Health. Expert in healthcare UX design.', NULL, NULL, false, 5, 'from-secondary to-accent'),
('David Kim', 'VP of Operations', '10+ years scaling healthcare startups. MBA from Harvard Business School.', NULL, NULL, false, 6, 'from-accent to-primary'),
('Dr. Robert Lee', 'Former FDA Commissioner', NULL, NULL, NULL, true, 1, NULL),
('Jennifer Walsh', 'Partner at Andreessen Horowitz', NULL, NULL, NULL, true, 2, NULL),
('Dr. Priya Sharma', 'WHO Digital Health Advisor', NULL, NULL, NULL, true, 3, NULL),
('Mark Stevens', 'Former CEO, Anthem', NULL, NULL, NULL, true, 4, NULL);