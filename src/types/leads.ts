// Lead management types
export interface Lead {
  id: string;
  contact_name: string;
  email: string;
  phone?: string;
  organization_name?: string; // Changed from company_name to match database
  organization_type?: string; // Add required database field
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
  // Add fields that exist in database but were missing
  budget_range?: string;
  company_size?: string;
  decision_timeline?: string;
  current_solution?: string;
  pain_points?: string;
  lead_temperature?: 'hot' | 'warm' | 'cold';
  preferred_contact_method?: string;
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
