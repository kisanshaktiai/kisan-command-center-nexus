
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  UserCheck, 
  ArrowRight,
  MessageSquare,
  Tag,
  Trophy,
  Target
} from 'lucide-react';
import { LeadTagManager } from './LeadTagManager';
import { useUpdateLeadStatus, useReassignLead, useConvertLeadToTenant } from '@/hooks/useLeadManagement';
import { LeadStatusSelect } from './LeadStatusSelect';
import type { Lead } from '@/types/leads';

interface LeadCardProps {
  lead: Lead;
  onReassign: (leadId: string) => void;
  onUpdateStatus: (leadId: string, status: Lead['status']) => void;
  onConvert: (leadId: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onReassign,
  onUpdateStatus,
  onConvert,
  isSelected = false,
  onSelect,
}) => {
  const updateStatus = useUpdateLeadStatus();

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'assigned': return 'bg-yellow-500';
      case 'contacted': return 'bg-orange-500';
      case 'qualified': return 'bg-green-500';
      case 'converted': return 'bg-emerald-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const canConvert = lead.status === 'qualified';
  
  const getConversionMessage = () => {
    switch (lead.status) {
      case 'new':
        return 'Assign and contact this lead to begin qualification process';
      case 'assigned':
        return 'Contact this lead to begin qualification process';
      case 'contacted':
        return 'Complete qualification to enable tenant conversion';
      case 'converted':
        return 'Lead has been converted to tenant';
      case 'rejected':
        return 'Lead was rejected and cannot be converted';
      default:
        return 'Complete the qualification process first';
    }
  };

  const handleStatusUpdate = async (newStatus: Lead['status']) => {
    try {
      await updateStatus.mutateAsync({ 
        leadId: lead.id, 
        status: newStatus,
        notes: `Status updated to ${newStatus}` 
      });
      onUpdateStatus(lead.id, newStatus);
    } catch (error) {
      console.error('Failed to update lead status:', error);
    }
  };

  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
              />
            )}
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                {lead.contact_name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  className={`text-white ${getStatusColor(lead.status)}`}
                >
                  {lead.status}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={getPriorityColor(lead.priority)}
                >
                  {lead.priority} priority
                </Badge>
                {lead.qualification_score > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Score: {lead.qualification_score}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {new Date(lead.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-gray-500" />
            <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
              {lead.email}
            </a>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-500" />
              <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                {lead.phone}
              </a>
            </div>
          )}
          {lead.organization_name && (
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-gray-500" />
              <span>{lead.organization_name}</span>
            </div>
          )}
        </div>

        {/* Lead Tags */}
        <div>
          <LeadTagManager leadId={lead.id} className="mt-2" />
        </div>

        {/* Assignment Info */}
        {lead.assigned_admin && (
          <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
            <UserCheck className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700">
              Assigned to: {lead.assigned_admin.full_name}
            </span>
            {lead.assigned_at && (
              <span className="text-blue-600 text-xs">
                ({new Date(lead.assigned_at).toLocaleDateString()})
              </span>
            )}
          </div>
        )}

        {/* Source */}
        {lead.source && (
          <div className="text-sm text-gray-600">
            <strong>Source:</strong> {lead.source}
          </div>
        )}

        {/* Notes */}
        {lead.notes && (
          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <strong>Notes:</strong> {lead.notes}
          </div>
        )}

        {/* Last Activity */}
        {lead.last_contact_at && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            Last contact: {new Date(lead.last_contact_at).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {/* Status Update */}
          <LeadStatusSelect
            currentStatus={lead.status}
            onStatusChange={handleStatusUpdate}
            disabled={updateStatus.isPending}
          />

          {/* Reassignment */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReassign(lead.id)}
            disabled={lead.status === 'converted'}
          >
            <UserCheck className="h-4 w-4 mr-1" />
            {lead.assigned_admin ? 'Reassign' : 'Assign'}
          </Button>

          {/* Conversion */}
          {canConvert ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => onConvert(lead.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Convert to Tenant
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              title={getConversionMessage()}
              className="text-gray-400"
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Convert {lead.status !== 'qualified' && '(Qualify first)'}
            </Button>
          )}
        </div>

        {/* Status-based guidance */}
        {!canConvert && lead.status !== 'converted' && lead.status !== 'rejected' && (
          <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200">
            <strong>Next step:</strong> {getConversionMessage()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
