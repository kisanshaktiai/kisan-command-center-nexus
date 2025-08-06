
import { useCallback } from 'react';
import { eventPublisher } from '@/services/EventPublisher';
import { auditService } from '@/services/AuditService';
import type { LeadEvent, ActionContext, Lead } from '@/types/leads';

export const useLeadEvents = () => {
  const publishLeadCreated = useCallback(async (
    lead: Lead,
    context: ActionContext
  ) => {
    await eventPublisher.publishLeadEvent(
      'lead_created',
      lead.id,
      context.tenant_id || '',
      {
        contact_name: lead.contact_name,
        email: lead.email,
        organization_name: lead.organization_name,
        priority: lead.priority,
        source: lead.source,
        qualification_score: lead.qualification_score
      },
      context
    );

    await auditService.logLeadAction(
      lead.id,
      'created',
      {},
      {
        contact_name: lead.contact_name,
        email: lead.email,
        status: lead.status,
        priority: lead.priority
      },
      context
    );
  }, []);

  const publishStatusChange = useCallback(async (
    leadId: string,
    tenantId: string,
    oldStatus: string,
    newStatus: string,
    context: ActionContext
  ) => {
    await eventPublisher.publishLeadEvent(
      'status_changed',
      leadId,
      tenantId,
      {
        old_status: oldStatus,
        new_status: newStatus,
        changed_at: new Date().toISOString()
      },
      context
    );

    await auditService.logLeadAction(
      leadId,
      'status_changed',
      { status: oldStatus },
      { status: newStatus },
      context
    );
  }, []);

  const publishLeadAssigned = useCallback(async (
    leadId: string,
    tenantId: string,
    oldAssignee: string | null,
    newAssignee: string,
    context: ActionContext
  ) => {
    await eventPublisher.publishLeadEvent(
      'assigned',
      leadId,
      tenantId,
      {
        old_assignee: oldAssignee,
        new_assignee: newAssignee,
        assigned_at: new Date().toISOString()
      },
      context
    );

    await auditService.logLeadAction(
      leadId,
      'assigned',
      { assigned_to: oldAssignee },
      { assigned_to: newAssignee },
      context
    );
  }, []);

  const publishLeadScored = useCallback(async (
    leadId: string,
    tenantId: string,
    score: number,
    recommendation: string,
    context: ActionContext
  ) => {
    await eventPublisher.publishLeadEvent(
      'scored',
      leadId,
      tenantId,
      {
        ai_score: score,
        ai_recommended_action: recommendation,
        scored_at: new Date().toISOString()
      },
      context
    );

    await auditService.logLeadAction(
      leadId,
      'updated',
      {},
      { ai_score: score, ai_recommended_action: recommendation },
      context
    );
  }, []);

  const publishLeadConverted = useCallback(async (
    leadId: string,
    tenantId: string,
    convertedTenantId: string,
    context: ActionContext
  ) => {
    await eventPublisher.publishLeadEvent(
      'converted',
      leadId,
      tenantId,
      {
        converted_tenant_id: convertedTenantId,
        converted_at: new Date().toISOString()
      },
      context
    );

    await auditService.logLeadAction(
      leadId,
      'converted',
      { status: 'qualified' },
      { status: 'converted', converted_tenant_id: convertedTenantId },
      context
    );
  }, []);

  return {
    publishLeadCreated,
    publishStatusChange,
    publishLeadAssigned,
    publishLeadScored,
    publishLeadConverted,
  };
};
