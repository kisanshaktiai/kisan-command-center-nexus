
-- Enhanced RLS policies for admin_users table
DROP POLICY IF EXISTS "Admins can manage all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can select their row" ON public.admin_users;
DROP POLICY IF EXISTS "Users can insert themselves as admin" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON public.admin_users;

-- Create more robust RLS policies
CREATE POLICY "Super admins can manage all admin users"
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Platform admins can manage regular admins"
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = true
      AND au.role = 'platform_admin'
    )
    AND role NOT IN ('super_admin', 'platform_admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = true
      AND au.role = 'platform_admin'
    )
    AND role NOT IN ('super_admin', 'platform_admin')
  );

CREATE POLICY "Admins can view their own record"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Self-registration for super admin email"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() 
    AND email = 'kisanshaktiai@gmail.com'
    AND role = 'super_admin'
  );

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  target_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit logs
CREATE POLICY "Super admins can view all audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Platform admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = true
      AND au.role IN ('platform_admin', 'super_admin')
    )
  );

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.admin_users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  priority VARCHAR(20) DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policy for notifications
CREATE POLICY "Admins can view their own notifications"
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Super admins can manage all notifications"
  ON public.admin_notifications
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action VARCHAR(50),
  p_target_admin_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.admin_audit_logs (
    admin_id,
    target_admin_id,
    action,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_target_admin_id,
    p_action,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create function to send admin notifications
CREATE OR REPLACE FUNCTION public.send_admin_notification(
  p_recipient_id UUID,
  p_title VARCHAR(255),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'info',
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.admin_notifications (
    recipient_id,
    title,
    message,
    type,
    priority,
    metadata
  ) VALUES (
    p_recipient_id,
    p_title,
    p_message,
    p_type,
    p_priority,
    p_metadata
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create trigger for admin user changes
CREATE OR REPLACE FUNCTION public.audit_admin_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_admin_action(
      'admin_user_created',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.full_name,
        'role', NEW.role,
        'is_active', NEW.is_active
      )
    );
    
    -- Send notification to all super admins
    INSERT INTO public.admin_notifications (recipient_id, title, message, type, priority)
    SELECT 
      id,
      'New Admin User Created',
      'A new admin user "' || NEW.full_name || '" (' || NEW.email || ') has been created with role: ' || NEW.role,
      'info',
      'normal'
    FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true AND id != auth.uid();
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_admin_action(
      'admin_user_updated',
      NEW.id,
      jsonb_build_object(
        'old_values', jsonb_build_object(
          'email', OLD.email,
          'full_name', OLD.full_name,
          'role', OLD.role,
          'is_active', OLD.is_active
        ),
        'new_values', jsonb_build_object(
          'email', NEW.email,
          'full_name', NEW.full_name,
          'role', NEW.role,
          'is_active', NEW.is_active
        )
      )
    );
    
    -- Send notification for status changes
    IF OLD.is_active != NEW.is_active THEN
      INSERT INTO public.admin_notifications (recipient_id, title, message, type, priority)
      SELECT 
        id,
        'Admin User Status Changed',
        'Admin user "' || NEW.full_name || '" has been ' || CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END,
        CASE WHEN NEW.is_active THEN 'success' ELSE 'warning' END,
        'high'
      FROM public.admin_users 
      WHERE role IN ('super_admin', 'platform_admin') AND is_active = true AND id != auth.uid();
    END IF;
    
    -- Send notification for role changes
    IF OLD.role != NEW.role THEN
      INSERT INTO public.admin_notifications (recipient_id, title, message, type, priority)
      SELECT 
        id,
        'Admin Role Changed',
        'Admin user "' || NEW.full_name || '" role changed from ' || OLD.role || ' to ' || NEW.role,
        'info',
        'high'
      FROM public.admin_users 
      WHERE role = 'super_admin' AND is_active = true AND id != auth.uid();
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_admin_action(
      'admin_user_deleted',
      OLD.id,
      jsonb_build_object(
        'email', OLD.email,
        'full_name', OLD.full_name,
        'role', OLD.role
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS audit_admin_user_changes_trigger ON public.admin_users;
CREATE TRIGGER audit_admin_user_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_user_changes();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_admin_id ON public.admin_audit_logs(target_admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_recipient_id ON public.admin_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at);
