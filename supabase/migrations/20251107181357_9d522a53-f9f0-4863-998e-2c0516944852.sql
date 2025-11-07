-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('volunteer', 'education')),
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  on_bus_route BOOLEAN NOT NULL DEFAULT false,
  hours_available TEXT NOT NULL,
  days_times_available TEXT NOT NULL,
  additional_requirements TEXT,
  org_name TEXT NOT NULL,
  org_email TEXT NOT NULL,
  org_phone TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on active opportunities for faster queries
CREATE INDEX idx_opportunities_active ON public.opportunities(active) WHERE active = true;

-- Create index on type for filtering
CREATE INDEX idx_opportunities_type ON public.opportunities(type);

-- Enable RLS (Row Level Security) - but allow public read access
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active opportunities
CREATE POLICY "Anyone can view active opportunities"
ON public.opportunities
FOR SELECT
USING (active = true);

-- Allow anyone to insert opportunities (for organization submissions)
CREATE POLICY "Anyone can create opportunities"
ON public.opportunities
FOR INSERT
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();