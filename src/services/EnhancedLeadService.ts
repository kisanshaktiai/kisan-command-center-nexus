import { TenantAwareService } from './TenantAwareService';
import { auditService } from './AuditService';
import { eventPublisher } from './EventPublisher';
import { telemetryService } from './TelemetryService';
import { leadScoringService } from './LeadScoringService';
import { supabase } from '@/integrations/supabase/client';
import type { Lead, ActionContext, CustomFieldValue } from '@/types/leads';

interface EnhancedCreateLeadData {
  contact_name: string;
  email: string;
  phone?: string;
  organization_name?: string;
  source?: string;
  source_id?: string;
  campaign_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  custom_fields?: CustomFieldValue[];
}

interface EnhancedUpdateLeadData {
  contact_name?: string;
  email?: string;
  phone?: string;
  organization_name?: string;
  status?: Lead['status'];
  priority?: Lead['priority'];
  notes?: string;
  qualification_score?: number;
  last_contact_at?: string;
  custom_fields?: CustomFieldValue[];
  source_id?: string;
  campaign_id?: string;
}

export class EnhancedLeadService extends TenantAwareService {
  private static instanceStorage: { instance?: EnhancedLeadService } = {};

  static getInstance(): EnhancedLeadService {
    if (!this.instanceStorage.instance) {
      this.instanceStorage.instance = new EnhancedLeadService();
    }
    return this.instanceStorage.instance;
  }

  async createLead(leadData: EnhancedCreateLeadData, context: ActionContext): Promise<Lead | null> {
    const startTime = Date.now();
    
    try {
      const tenantId = await this.getTenantId();
      if (!tenantId) throw new Error('No tenant context available');

      console.log('EnhancedLeadService: Creating lead:', leadData);

      // Convert custom fields to JSON format
      const customFieldsJson = leadData.custom_fields?.map(field => ({
        field_name: field.field_name,
        field_type: field.field_type,
        value: field.value,
        label: field.label
      })) || [];

      const { data, error } = await supabase
        .from('leads')
        .insert({
          contact_name: leadData.contact_name,
          email: leadData.email,
          phone: leadData.phone,
          organization_name: leadData.organization_name,
          organization_type: 'company', // Add required field
          source: leadData.source,
          source_id: leadData.source_id,
          campaign_id: leadData.campaign_id,
          priority: leadData.priority || 'medium',
          notes: leadData.notes,
          custom_fields: customFieldsJson as any,
          status: 'new',
          qualification_score: 0,
          lead_score: 0,
        })
        .select()
        .single();

      if (error) {
        telemetryService.recordEvent('create_lead_error', false, error.message);
        throw error;
      }

      // Transform database response to Lead type
      const lead = this.transformDbRowToLead(data);

      // Calculate AI score asynchronously
      leadScoringService.calculateLeadScore(lead).catch(console.error);

      // Publish events
      await eventPublisher.publishLeadEvent(
        'lead_created',
        lead.id,
        tenantId,
        { ...leadData },
        context
      );

      // Log audit trail
      await auditService.logLeadAction(
        lead.id,
        'created',
        {},
        leadData,
        context
      );

      telemetryService.recordTiming('create_lead_duration', Date.now() - startTime, true);
      console.log('EnhancedLeadService: Lead created successfully:', lead);
      return lead;

    } catch (error) {
      telemetryService.recordTiming('create_lead_duration', Date.now() - startTime, false, error instanceof Error ? error.message : 'Unknown error');
      console.error('EnhancedLeadService: Error creating lead:', error);
      return null;
    }
  }

  async updateLead(leadId: string, updateData: EnhancedUpdateLeadData, context: ActionContext): Promise<Lead | null> {
    const startTime = Date.now();

    try {
      const tenantId = await this.getTenantId();
      if (!tenantId) throw new Error('No tenant context available');

      // Get current lead for audit logging
      const { data: currentLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!currentLead) throw new Error('Lead not found');

      const updatePayload: any = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // Convert custom fields to JSON format if provided
      if (updateData.custom_fields) {
        updatePayload.custom_fields = updateData.custom_fields.map(field => ({
          field_name: field.field_name,
          field_type: field.field_type,
          value: field.value,
          label: field.label
        }));
      }

      // Remove undefined values
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      });

      const { data, error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', leadId)
        .select()
        .single();

      if (error) {
        telemetryService.recordEvent('update_lead_error', false, error.message);
        throw error;
      }

      const updatedLead = this.transformDbRowToLead(data);

      // Recalculate AI score if relevant fields changed
      if (updateData.status || updateData.priority || updateData.notes) {
        leadScoringService.calculateLeadScore(updatedLead).catch(console.error);
      }

      // Publish status change event if status changed
      if (updateData.status && currentLead.status !== updateData.status) {
        await eventPublisher.publishLeadEvent(
          'status_changed',
          leadId,
          tenantId,
          { 
            old_status: currentLead.status, 
            new_status: updateData.status 
          },
          context
        );
      }

      // Log audit trail
      await auditService.logLeadAction(
        leadId,
        'updated',
        currentLead,
        updateData,
        context
      );

      telemetryService.recordTiming('update_lead_duration', Date.now() - startTime, true);
      console.log('EnhancedLeadService: Lead updated successfully:', updatedLead);
      return updatedLead;

    } catch (error) {
      telemetryService.recordTiming('update_lead_duration', Date.now() - startTime, false, error instanceof Error ? error.message : 'Unknown error');
      console.error('EnhancedLeadService: Error updating lead:', error);
      return null;
    }
  }

  async assignLead(leadId: string, adminId: string, reason: string, context: ActionContext): Promise<boolean> {
    const startTime = Date.now();

    try {
      const tenantId = await this.getTenantId();
      if (!tenantId) throw new Error('No tenant context available');

      // Get current lead
      const { data: currentLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!currentLead) throw new Error('Lead not found');

      // Use the existing reassign_lead RPC function
      const { error } = await supabase.rpc('reassign_lead', {
        p_lead_id: leadId,
        p_new_admin_id: adminId,
        p_reason: reason,
      });

      if (error) {
        telemetryService.recordEvent('assign_lead_error', false, error.message);
        throw error;
      }

      // Publish assignment event
      await eventPublisher.publishLeadEvent(
        'assigned',
        leadId,
        tenantId,
        {
          old_assignee: currentLead.assigned_to,
          new_assignee: adminId,
          reason
        },
        context
      );

      // Log audit trail
      await auditService.logLeadAction(
        leadId,
        'assigned',
        { assigned_to: currentLead.assigned_to },
        { assigned_to: adminId },
        context
      );

      telemetryService.recordTiming('assign_lead_duration', Date.now() - startTime, true);
      return true;

    } catch (error) {
      telemetryService.recordTiming('assign_lead_duration', Date.now() - startTime, false, error instanceof Error ? error.message : 'Unknown error');
      console.error('EnhancedLeadService: Error assigning lead:', error);
      return false;
    }
  }

  async getLeadsWithAnalytics(): Promise<{ leads: Lead[]; analytics: any }> {
    const startTime = Date.now();

    try {
      const tenantId = await this.getTenantId();
      if (!tenantId) return { leads: [], analytics: {} };

      // Get leads with all new fields
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          *,
          assigned_admin:admin_users!assigned_to(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        telemetryService.recordEvent('get_leads_error', false, error.message);
        throw error;
      }

      // Transform database rows to Lead objects
      const transformedLeads = (leads || []).map(this.transformDbRowToLead);

      // Calculate analytics
      const analytics = {
        total: transformedLeads.length,
        byStatus: this.groupByField(transformedLeads, 'status'),
        byPriority: this.groupByField(transformedLeads, 'priority'),
        bySource: this.groupByField(transformedLeads, 'source'),
        avgAiScore: this.calculateAverageAiScore(transformedLeads),
        conversionMetrics: this.calculateConversionMetrics(transformedLeads)
      };

      telemetryService.recordTiming('get_leads_duration', Date.now() - startTime, true);
      return { leads: transformedLeads, analytics };

    } catch (error) {
      telemetryService.recordTiming('get_leads_duration', Date.now() - startTime, false, error instanceof Error ? error.message : 'Unknown error');
      console.error('EnhancedLeadService: Error fetching leads with analytics:', error);
      return { leads: [], analytics: {} };
    }
  }

  private transformDbRowToLead(dbRow: any): Lead {
    // Transform custom_fields from JSON to CustomFieldValue[]
    const customFields: CustomFieldValue[] = Array.isArray(dbRow.custom_fields) 
      ? dbRow.custom_fields 
      : [];

    return {
      ...dbRow,
      custom_fields: customFields,
      assigned_admin: dbRow.assigned_admin ? {
        full_name: dbRow.assigned_admin.full_name,
        email: dbRow.assigned_admin.email
      } : null
    } as Lead;
  }

  private groupByField(leads: any[], field: string): Record<string, number> {
    return leads.reduce((acc, lead) => {
      const value = lead[field] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAverageAiScore(leads: any[]): number {
    const leadsWithScore = leads.filter(lead => typeof lead.ai_score === 'number');
    if (leadsWithScore.length === 0) return 0;
    
    const totalScore = leadsWithScore.reduce((sum, lead) => sum + lead.ai_score, 0);
    return Math.round(totalScore / leadsWithScore.length);
  }

  private calculateConversionMetrics(leads: any[]): any {
    const total = leads.length;
    if (total === 0) return { rate: 0, avgTimeToConversion: 0 };

    const converted = leads.filter(lead => lead.status === 'converted');
    const rate = Math.round((converted.length / total) * 100);

    const conversionsWithTime = converted.filter(lead => lead.converted_at);
    let avgTimeToConversion = 0;

    if (conversionsWithTime.length > 0) {
      const totalTime = conversionsWithTime.reduce((sum, lead) => {
        const created = new Date(lead.created_at).getTime();
        const converted = new Date(lead.converted_at).getTime();
        return sum + (converted - created);
      }, 0);

      avgTimeToConversion = Math.round(totalTime / conversionsWithTime.length / (1000 * 60 * 60 * 24)); // days
    }

    return { rate, avgTimeToConversion };
  }
}

export const enhancedLeadService = EnhancedLeadService.getInstance();
