
import { supabase } from '@/integrations/supabase/client';
import { TenantAwareService } from './TenantAwareService';
import type { LeadCommunicationTemplate, LeadCommunicationLog } from '@/types/leads';

export class LeadCommunicationService extends TenantAwareService {
  private static instance: LeadCommunicationService;

  static getInstance(): LeadCommunicationService {
    if (!this.instance) {
      this.instance = new LeadCommunicationService();
    }
    return this.instance;
  }

  async getTemplates(type?: string): Promise<LeadCommunicationTemplate[]> {
    try {
      const tenantId = await this.getTenantId();
      if (!tenantId) return [];

      let query = supabase
        .from('lead_communication_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (type) {
        query = query.eq('template_type', type);
      }

      const { data, error } = await query.order('template_name');

      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        tenant_id: item.tenant_id,
        template_name: item.template_name,
        template_type: item.template_type,
        subject: item.subject,
        content: item.content,
        variables: Array.isArray(item.variables) ? item.variables : [],
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) as LeadCommunicationTemplate[];
    } catch (error) {
      console.error('Error fetching communication templates:', error);
      return [];
    }
  }

  async createTemplate(template: Omit<LeadCommunicationTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<LeadCommunicationTemplate | null> {
    try {
      const tenantId = await this.getTenantId();
      if (!tenantId) throw new Error('No tenant context');

      const { data, error } = await supabase
        .from('lead_communication_templates')
        .insert({
          ...template,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) throw error;
      return data as LeadCommunicationTemplate;
    } catch (error) {
      console.error('Error creating communication template:', error);
      return null;
    }
  }

  async sendCommunication(
    leadId: string,
    templateId: string,
    variables: Record<string, string> = {},
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      // Get template
      const { data: template } = await supabase
        .from('lead_communication_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!template) throw new Error('Template not found');

      // Replace variables in template
      let content = template.content;
      let subject = template.subject || '';

      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        content = content.replace(new RegExp(placeholder, 'g'), value);
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
      });

      // Send via edge function
      const { data, error } = await supabase.functions.invoke('send-lead-communication', {
        body: {
          lead_id: leadId,
          template_type: template.template_type,
          subject,
          content,
          metadata: {
            template_id: templateId,
            variables,
            ...metadata
          }
        }
      });

      if (error) throw error;

      // Log communication
      await this.logCommunication(leadId, template.template_type, 'outbound', subject, content, metadata);

      return true;
    } catch (error) {
      console.error('Error sending communication:', error);
      return false;
    }
  }

  private async logCommunication(
    leadId: string,
    type: string,
    direction: 'inbound' | 'outbound',
    subject: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const { data: userResponse } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('lead_communication_logs')
        .insert({
          lead_id: leadId,
          communication_type: type,
          direction,
          subject,
          content,
          status: 'sent',
          sent_at: new Date().toISOString(),
          created_by: userResponse.user?.id,
          metadata
        });

      if (error) {
        console.error('Failed to log communication:', error);
      }
    } catch (error) {
      console.error('Error logging communication:', error);
    }
  }
}

export const leadCommunicationService = LeadCommunicationService.getInstance();
