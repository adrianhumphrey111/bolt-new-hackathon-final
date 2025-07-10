-- Add missing INSERT policy for profiles table
-- This allows authenticated users to insert their own profile data
-- Required for upsert operations to work correctly

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also add a more comprehensive ALL policy to handle upserts better
CREATE POLICY "Users can manage their own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Drop the old update policy since the ALL policy covers it
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;