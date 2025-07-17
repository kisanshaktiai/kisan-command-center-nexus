
-- Create super admin schema and roles
CREATE SCHEMA IF NOT EXISTS super_admin;

-- Create super admin roles enum
CREATE TYPE super_admin.admin_role AS ENUM ('super_admin', 'platform_admin', 'support_admin', 'security_admin');

-- Create super admin users table
CREATE TABLE super_admin.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role super_admin.admin_role NOT NULL DEFAULT 'support_admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    ip_whitelist JSONB DEFAULT '[]'::jsonb,
    two_fa_enabled BOOLEAN DEFAULT false,
    two_fa_secret VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES super_admin.admin_users(id)
);

-- Create admin sessions table
CREATE TABLE super_admin.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES super_admin.admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(512) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create audit logs table
CREATE TABLE super_admin.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES super_admin.admin_users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    tenant_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create platform metrics table
CREATE TABLE super_admin.platform_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL,
    metadata JSONB DEFAULT '{}'::jsonb,
    tenant_id UUID,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system alerts table
CREATE TABLE super_admin.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    tenant_id UUID,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES super_admin.admin_users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create feature flags table
CREATE TABLE super_admin.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_tenants JSONB DEFAULT '[]'::jsonb,
    conditions JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES super_admin.admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subscription plans table
CREATE TABLE super_admin.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name VARCHAR(255) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    features JSONB DEFAULT '{}'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tenant subscriptions table
CREATE TABLE super_admin.tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    plan_id UUID REFERENCES super_admin.subscription_plans(id),
    status VARCHAR(50) DEFAULT 'active',
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    next_billing_date DATE,
    total_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create support tickets table
CREATE TABLE super_admin.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID,
    farmer_id UUID,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    category VARCHAR(100),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES super_admin.admin_users(id),
    resolution_notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create system maintenance table
CREATE TABLE super_admin.system_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'scheduled',
    affected_services JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES super_admin.admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE super_admin.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin.platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin.system_maintenance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for super admin access
CREATE POLICY "Super admins can manage all admin users" ON super_admin.admin_users
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin.admin_users au 
        WHERE au.id = auth.uid() 
        AND au.role IN ('super_admin', 'platform_admin')
        AND au.is_active = true
    )
);

CREATE POLICY "Admins can view their own sessions" ON super_admin.admin_sessions
FOR SELECT TO authenticated
USING (
    admin_user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM super_admin.admin_users au 
        WHERE au.id = auth.uid() 
        AND au.role = 'super_admin'
        AND au.is_active = true
    )
);

CREATE POLICY "Super admins can access all audit logs" ON super_admin.audit_logs
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin.admin_users au 
        WHERE au.id = auth.uid() 
        AND au.role IN ('super_admin', 'security_admin')
        AND au.is_active = true
    )
);

CREATE POLICY "Admins can access platform metrics" ON super_admin.platform_metrics
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin.admin_users au 
        WHERE au.id = auth.uid() 
        AND au.is_active = true
    )
);

CREATE POLICY "Admins can manage system alerts" ON super_admin.system_alerts
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin.admin_users au 
        WHERE au.id = auth.uid() 
        AND au.is_active = true
    )
);

CREATE POLICY "Platform admins can manage feature flags" ON super_admin.feature_flags
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin.admin_users au 
        WHERE au.id = auth.uid() 
        AND au.role IN ('super_admin', 'platform_admin')
        AND au.is_active = true
    )
);

CREATE POLICY "Admins can manage subscription plans" ON super_admin.subscription_plans
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin.admin_users au 
        WHERE au.id = auth.uid() 
        AND au.role IN ('super_admin', 'platform_admin')
        AND au.is_active = true
    )
);

CREATE POLICY "Admins can manage tenant subscriptions" ON super_admin.tenant_subscriptions
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin.admin_users au 
        WHERE au.id = auth.uid() 
        AND au.is_active = true
    )
);

CREATE POLICY "Admins can manage support tickets" ON super_admin.support_tickets
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin.admin_users au 
        WHERE au.id = auth.uid() 
        AND au.is_active = true
    )
);

CREATE POLICY "Platform admins can manage maintenance" ON super_admin.system_maintenance
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin.admin_users au 
        WHERE au.id = auth.uid() 
        AND au.role IN ('super_admin', 'platform_admin')
        AND au.is_active = true
    )
);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION super_admin.log_admin_action(
    p_admin_user_id UUID,
    p_action VARCHAR(255),
    p_resource_type VARCHAR(100),
    p_resource_id UUID DEFAULT NULL,
    p_tenant_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO super_admin.audit_logs (
        admin_user_id, action, resource_type, resource_id, tenant_id,
        details, ip_address, user_agent, success, error_message
    ) VALUES (
        p_admin_user_id, p_action, p_resource_type, p_resource_id, p_tenant_id,
        p_details, p_ip_address, p_user_agent, p_success, p_error_message
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check admin permissions
CREATE OR REPLACE FUNCTION super_admin.has_admin_permission(
    p_user_id UUID,
    p_required_role super_admin.admin_role
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM super_admin.admin_users 
        WHERE id = p_user_id 
        AND role = p_required_role 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get platform stats
CREATE OR REPLACE FUNCTION super_admin.get_platform_stats()
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_tenants', (SELECT COUNT(*) FROM tenants WHERE status = 'active'),
        'total_farmers', (SELECT COUNT(*) FROM farmers),
        'total_lands', (SELECT COUNT(*) FROM lands WHERE is_active = true),
        'active_subscriptions', (SELECT COUNT(*) FROM super_admin.tenant_subscriptions WHERE status = 'active'),
        'support_tickets_open', (SELECT COUNT(*) FROM super_admin.support_tickets WHERE status IN ('open', 'in_progress')),
        'system_alerts_active', (SELECT COUNT(*) FROM super_admin.system_alerts WHERE is_resolved = false)
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_admin_users_email ON super_admin.admin_users(email);
CREATE INDEX idx_admin_users_role ON super_admin.admin_users(role);
CREATE INDEX idx_audit_logs_admin_user_id ON super_admin.audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_created_at ON super_admin.audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON super_admin.audit_logs(action);
CREATE INDEX idx_platform_metrics_type_name ON super_admin.platform_metrics(metric_type, metric_name);
CREATE INDEX idx_platform_metrics_recorded_at ON super_admin.platform_metrics(recorded_at);
CREATE INDEX idx_system_alerts_severity ON super_admin.system_alerts(severity);
CREATE INDEX idx_system_alerts_resolved ON super_admin.system_alerts(is_resolved);
CREATE INDEX idx_support_tickets_status ON super_admin.support_tickets(status);
CREATE INDEX idx_support_tickets_tenant_id ON super_admin.support_tickets(tenant_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION super_admin.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON super_admin.admin_users
    FOR EACH ROW EXECUTE FUNCTION super_admin.update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON super_admin.feature_flags
    FOR EACH ROW EXECUTE FUNCTION super_admin.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON super_admin.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION super_admin.update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at
    BEFORE UPDATE ON super_admin.tenant_subscriptions
    FOR EACH ROW EXECUTE FUNCTION super_admin.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON super_admin.support_tickets
    FOR EACH ROW EXECUTE FUNCTION super_admin.update_updated_at_column();
