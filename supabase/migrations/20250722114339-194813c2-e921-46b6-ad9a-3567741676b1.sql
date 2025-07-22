
-- Create audit logging table for admin login attempts
CREATE TABLE IF NOT EXISTS admin_login_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('success', 'failed', 'blocked')),
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  failure_reason TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE admin_login_audit ENABLE ROW LEVEL SECURITY;

-- Policy for admin audit access
CREATE POLICY "Super admins can view all audit logs" ON admin_login_audit
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'platform_admin') 
      AND is_active = true
    )
  );

-- Create admin sessions table for session management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  remember_me BOOLEAN DEFAULT false,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on sessions table
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for admin sessions
CREATE POLICY "Users can manage their own sessions" ON admin_sessions
  FOR ALL USING (user_id = auth.uid());

-- Create function to sync auth.users with admin_users
CREATE OR REPLACE FUNCTION sync_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if the user has a role in user_metadata or app_metadata
  IF (NEW.raw_user_meta_data->>'role' IN ('super_admin', 'platform_admin', 'admin') OR 
      NEW.raw_app_meta_data->>'role' IN ('super_admin', 'platform_admin', 'admin')) THEN
    
    INSERT INTO admin_users (
      id, 
      email, 
      full_name, 
      role, 
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Admin User'),
      COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_app_meta_data->>'role', 'admin'),
      true,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users insert/update
DROP TRIGGER IF EXISTS sync_admin_user_trigger ON auth.users;
CREATE TRIGGER sync_admin_user_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_admin_user();

-- Create RPC function for pre-authentication role check
CREATE OR REPLACE FUNCTION check_admin_access(user_email TEXT)
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  admin_record RECORD;
BEGIN
  -- Check if user exists in auth.users
  SELECT id, email, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, banned_until
  INTO user_record
  FROM auth.users 
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'account_not_found',
      'message', 'Account not found'
    );
  END IF;
  
  -- Check if account is banned
  IF user_record.banned_until IS NOT NULL AND user_record.banned_until > now() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'account_suspended',
      'message', 'Account suspended'
    );
  END IF;
  
  -- Check if user has admin role in metadata
  IF NOT (user_record.raw_user_meta_data->>'role' IN ('super_admin', 'platform_admin', 'admin') OR 
          user_record.raw_app_meta_data->>'role' IN ('super_admin', 'platform_admin', 'admin')) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'insufficient_privileges',
      'message', 'Access denied - Admin privileges required'
    );
  END IF;
  
  -- Check admin_users table
  SELECT * INTO admin_record
  FROM admin_users 
  WHERE id = user_record.id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'admin_inactive',
      'message', 'Admin account inactive'
    );
  END IF;
  
  -- Get last login info
  SELECT created_at, ip_address
  INTO user_record
  FROM admin_login_audit 
  WHERE user_id = user_record.id AND attempt_type = 'success'
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Count active sessions
  DECLARE
    active_sessions_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO active_sessions_count
    FROM admin_sessions 
    WHERE user_id = admin_record.id 
    AND is_active = true 
    AND expires_at > now();
  END;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'user_id', admin_record.id,
    'role', admin_record.role,
    'last_login', COALESCE(user_record.created_at, null),
    'last_login_ip', COALESCE(user_record.ip_address, null),
    'active_sessions_count', active_sessions_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log admin login attempts
CREATE OR REPLACE FUNCTION log_admin_login_attempt(
  p_user_id UUID,
  p_email TEXT,
  p_attempt_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO admin_login_audit (
    user_id,
    email,
    attempt_type,
    ip_address,
    user_agent,
    device_fingerprint,
    failure_reason,
    session_id
  ) VALUES (
    p_user_id,
    p_email,
    p_attempt_type,
    p_ip_address,
    p_user_agent,
    p_device_fingerprint,
    p_failure_reason,
    p_session_id
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to manage admin sessions
CREATE OR REPLACE FUNCTION create_admin_session(
  p_user_id UUID,
  p_device_fingerprint TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_remember_me BOOLEAN DEFAULT false
)
RETURNS TEXT AS $$
DECLARE
  session_token TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate session token
  session_token := encode(gen_random_bytes(32), 'hex');
  
  -- Set expiration (30 minutes for regular, 30 days for remember me)
  IF p_remember_me THEN
    expires_at := now() + interval '30 days';
  ELSE
    expires_at := now() + interval '30 minutes';
  END IF;
  
  -- Insert session
  INSERT INTO admin_sessions (
    user_id,
    session_token,
    device_fingerprint,
    ip_address,
    user_agent,
    remember_me,
    expires_at
  ) VALUES (
    p_user_id,
    session_token,
    p_device_fingerprint,
    p_ip_address,
    p_user_agent,
    p_remember_me,
    expires_at
  );
  
  RETURN session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(p_session_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE admin_sessions 
  SET 
    last_activity = now(),
    expires_at = CASE 
      WHEN remember_me THEN expires_at -- Don't extend remember me sessions
      ELSE now() + interval '30 minutes' -- Extend regular sessions
    END
  WHERE session_token = p_session_token 
  AND is_active = true 
  AND expires_at > now();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_login_audit_user_id ON admin_login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_audit_email ON admin_login_audit(email);
CREATE INDEX IF NOT EXISTS idx_admin_login_audit_created_at ON admin_login_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Cleanup expired sessions function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM admin_sessions 
  WHERE expires_at < now() OR is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
