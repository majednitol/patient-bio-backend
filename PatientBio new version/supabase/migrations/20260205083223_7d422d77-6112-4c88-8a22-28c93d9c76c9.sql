-- Create pathologist test catalog table
CREATE TABLE public.pathologist_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pathologist_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  category TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sample_type TEXT,
  turnaround_time TEXT,
  preparation_instructions TEXT,
  reference_ranges TEXT,
  template_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pathologist_tests ENABLE ROW LEVEL SECURITY;

-- RLS policies for pathologists to manage their own tests
CREATE POLICY "Pathologists can view their own tests" 
ON public.pathologist_tests 
FOR SELECT 
USING (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can create their own tests" 
ON public.pathologist_tests 
FOR INSERT 
WITH CHECK (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can update their own tests" 
ON public.pathologist_tests 
FOR UPDATE 
USING (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can delete their own tests" 
ON public.pathologist_tests 
FOR DELETE 
USING (auth.uid() = pathologist_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pathologist_tests_updated_at
BEFORE UPDATE ON public.pathologist_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_pathologist_tests_pathologist_id ON public.pathologist_tests(pathologist_id);
CREATE INDEX idx_pathologist_tests_category ON public.pathologist_tests(category);
CREATE INDEX idx_pathologist_tests_is_active ON public.pathologist_tests(is_active);