-- Add composition tracking columns to renders table
ALTER TABLE public.renders 
ADD COLUMN IF NOT EXISTS composition_name text,
ADD COLUMN IF NOT EXISTS serve_url text,
ADD COLUMN IF NOT EXISTS site_name text;

-- Add index for faster lookups by composition name
CREATE INDEX IF NOT EXISTS idx_renders_composition_name ON public.renders(composition_name);
CREATE INDEX IF NOT EXISTS idx_renders_user_project ON public.renders(user_id, project_id);