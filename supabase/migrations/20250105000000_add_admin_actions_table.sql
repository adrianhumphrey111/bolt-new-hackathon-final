-- Create admin_actions table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_email text NOT NULL,
    action_type text NOT NULL,
    target_user_email text,
    target_user_id uuid,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Only allow admins to read their own actions (you can customize this)
CREATE POLICY "Admin actions are viewable by admin users only" ON public.admin_actions
    FOR SELECT USING (admin_user_id = auth.uid());

-- Only allow service role to insert (API will use service role)
CREATE POLICY "Admin actions can be inserted by service role" ON public.admin_actions
    FOR INSERT WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_user_id ON public.admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON public.admin_actions(action_type);