// Lead management types - Updated for tenant alignment
export interface Lead {
  id: string;
  // New tenant-aligned fields (direct mapping)
  name: string; // was organization_name
  owner_name: string; // was contact_name
  owner_email: string; // was email
  owner_phone?: string; // was phone
  type?: string; // was organization_type, now uses tenant_type enum
  
  // Additional tenant fields now available in leads
  business_registration?: string;
  business_address?: any;
  established_date?: string;
  slug?: string;
  subscription_plan?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  subdomain?: string;
  custom_domain?: string;
  
  // Existing lead-specific fields
  assigned_to?: string;
  assigned_at?: string;
  status: 'new' | 'assigned' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  qualification_score: number;
  converted_tenant_id?: string;
  converted_at?: string;
  rejection_reason?: string;
  last_contact_at?: string;
  next_follow_up_at?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  metadata?: Record<string, any>;
  
  // Core database fields that exist
  lead_score?: number;
  marketing_qualified?: boolean;
  sales_qualified?: boolean;
  demo_scheduled?: boolean;
  proposal_sent?: boolean;
  contract_sent?: boolean;
  last_activity?: string;
  created_by?: string;
  
  // Add assigned admin information
  assigned_admin?: {
    full_name: string;
    email: string;
  } | null;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'status_change';
  title: string;
  description?: string;
  outcome?: string;
  scheduled_at?: string;
  completed_at?: string;
  created_by?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Add user information for activities
  created_by_user?: {
    full_name: string;
    email: string;
  } | null;
}

export interface LeadCommunicationLog {
  id: string;
  lead_id: string;
  communication_type: 'email' | 'call' | 'sms' | 'meeting' | 'linkedin';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content?: string;
  status: string;
  sent_at: string;
  opened_at?: string;
  replied_at?: string;
  created_by?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface LeadTag {
  id: string;
  lead_id: string;
  tag_name: string;
  tag_color: string;
  created_by?: string;
  created_at: string;
}

export interface LeadScoringRule {
  id: string;
  rule_name: string;
  rule_type: 'demographic' | 'behavioral' | 'engagement' | 'company';
  conditions: Record<string, any>;
  score_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadAssignmentRule {
  id: string;
  rule_name: string;
  rule_type: 'round_robin' | 'load_balanced' | 'territory' | 'skill_based';
  conditions: Record<string, any>;
  admin_pool: string[];
  is_active: boolean;
  priority_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface LeadAssignment {
  id: string;
  lead_id: string;
  assigned_from?: string;
  assigned_to: string;
  assignment_type: 'auto' | 'manual' | 'reassign';
  assignment_reason?: string;
  assigned_at: string;
  metadata: Record<string, any>;
}

export interface TeamInvitation {
  id: string;
  lead_id?: string;
  tenant_id?: string;
  invited_email: string;
  invited_name?: string;
  role: string;
  invitation_token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  sent_at: string;
  accepted_at?: string;
  created_by?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
