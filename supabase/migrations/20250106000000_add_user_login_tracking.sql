-- Add login tracking columns to users table
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_ip TEXT,
ADD COLUMN IF NOT EXISTS last_login_user_agent TEXT;

-- Create a function to update login stats
CREATE OR REPLACE FUNCTION update_user_login_stats(user_id UUID, ip_address TEXT DEFAULT NULL, user_agent TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE auth.users 
  SET 
    login_count = COALESCE(login_count, 0) + 1,
    last_login_ip = COALESCE(ip_address, last_login_ip),
    last_login_user_agent = COALESCE(user_agent, last_login_user_agent),
    last_sign_in_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically update login stats on sign in
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if last_sign_in_at actually changed
  IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    PERFORM update_user_login_stats(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_login();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_login_stats(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_login() TO authenticated;