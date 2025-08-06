
import { supabase } from '@/integrations/supabase/client';
import { TenantAwareService } from './TenantAwareService';
import type { LeadAuditLog, ActionContext } from '@/types/leads';

export class AuditService extends TenantAwareService {
  private static instance: AuditService;

  static getInstance(): AuditService {
    if (!this.instance) {
      this.instance = new AuditService();
    }
    return this.instance;
  }

  async logLeadAction(
    leadId: string,
    actionType: LeadAuditLog['action_type'],
    oldValues: Record<string, any> = {},
    newValues: Record<string, any> = {},
    context: ActionContext
  ): Promise<void> {
    const tenantId = await this.getTenantId();
    if (!tenantId) return;

    try {
      const { data: userResponse } = await supabase.auth.getUser();
      
      const auditEntry = {
        lead_id: leadId,
        tenant_id: tenantId,
        action_type: actionType,
        old_values: oldValues,
        new_values: newValues,
        performed_by: userResponse.user?.id,
        source: context.source,
        context: {
          user_agent: context.user_agent,
          ip_address: context.ip_address,
          session_id: context.session_id,
          metadata: context.metadata || {}
        }
      };

      const { error } = await supabase
        .from('lead_audit_logs')
        .insert(auditEntry);

      if (error) {
        console.error('Failed to log audit entry:', error);
      }
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  async getLeadAuditHistory(leadId: string): Promise<LeadAuditLog[]> {
    try {
      const tenantId = await this.getTenantId();
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('lead_audit_logs')
        .select('*')
        .eq('lead_id', leadId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LeadAuditLog[];
    } catch (error) {
      console.error('Error fetching audit history:', error);
      return [];
    }
  }
}

export const auditService = AuditService.getInstance();
