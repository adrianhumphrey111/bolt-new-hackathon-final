-- Update the quality constraint to include 'ultra'
ALTER TABLE public.renders 
DROP CONSTRAINT renders_quality_check;

ALTER TABLE public.renders 
ADD CONSTRAINT renders_quality_check 
CHECK (quality = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'ultra'::text]));

-- Update the default quality to ultra for new records
ALTER TABLE public.renders 
ALTER COLUMN quality SET DEFAULT 'ultra'::text;