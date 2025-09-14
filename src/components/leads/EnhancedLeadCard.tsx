import React, { useState } from 'react';
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
  Target,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { LeadTagManager } from './LeadTagManager';
import { EnhancedLeadStatusSelect } from './EnhancedLeadStatusSelect';
import { LeadWorkflowGuide } from './LeadWorkflowGuide';
import { LeadActivityTimeline } from './LeadActivityTimeline';
import { TenantVerificationModal } from './TenantVerificationModal';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { useUpdateLeadStatus } from '@/hooks/useLeadManagement';
import type { Lead } from '@/types/leads';

interface LeadCardProps {
  lead: Lead;
  onReassign: (leadId: string) => void;
  onConvert: (leadId: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onRefresh?: () => void;
  showConvertButton?: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onReassign,
  onConvert,
  isSelected = false,
  onSelect,
  expanded = false,
  onToggleExpanded,
  onRefresh,
  showConvertButton = false
}) => {
  const [showTenantVerification, setShowTenantVerification] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const updateStatus = useUpdateLeadStatus();

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

  const handleStatusUpdate = async (leadId: string, newStatus: Lead['status'], notes?: string) => {
    try {
      console.log('LeadCard: Handling status update:', { leadId, newStatus, notes });
      await updateStatus.mutateAsync({ 
        leadId, 
        status: newStatus,
        notes: notes || `Status updated to ${newStatus}` 
      });
    } catch (error) {
      console.error('LeadCard: Failed to update lead status:', error);
      throw error;
    }
  };

  const handleConvertLead = (leadId: string) => {
    console.log('LeadCard: Handling lead conversion for:', leadId);
    onConvert(leadId);
  };

  const handleTenantInfoClick = () => {
    if (lead.status === 'converted') {
      setShowTenantVerification(true);
    }
  };

  const handleConversionSuccess = () => {
    onRefresh?.();
    setShowTenantVerification(false);
    setShowConvertDialog(false);
  };

  const handleConvertClick = () => {
    setShowConvertDialog(true);
  };

  return (
    <>
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

          {/* Tenant Information for Converted Leads */}
          {lead.status === 'converted' && lead.converted_tenant_id && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Converted to Tenant</span>
              </div>
              <div className="text-xs text-green-700 space-y-1">
                <div>Tenant ID: {lead.converted_tenant_id.slice(0, 8)}...</div>
                {lead.converted_at && (
                  <div>Converted: {new Date(lead.converted_at).toLocaleDateString()}</div>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs bg-white hover:bg-green-50 border-green-300"
                  onClick={handleTenantInfoClick}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Verify Tenant Status
                </Button>
                {showConvertButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
                    onClick={handleConvertClick}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Convert Again
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {/* Status Update with Conversion Handling */}
            <EnhancedLeadStatusSelect
              lead={lead}
              onStatusChange={handleStatusUpdate}
              onConvertLead={handleConvertLead}
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

            {/* Direct Conversion Button for Qualified Leads */}
            {canConvert && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onConvert(lead.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                Convert to Tenant
              </Button>
            )}

            {/* Expand/Collapse */}
            {onToggleExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpanded}
                className="ml-auto"
              >
                {expanded ? 'Show Less' : 'Show More'}
              </Button>
            )}
          </div>

          {/* Expanded Content */}
          {expanded && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <LeadWorkflowGuide lead={lead} />
                <LeadActivityTimeline leadId={lead.id} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TenantVerificationModal
        isOpen={showTenantVerification}
        onClose={() => setShowTenantVerification(false)}
        lead={lead}
        onConversionSuccess={handleConversionSuccess}
      />

      <ConvertLeadDialog
        isOpen={showConvertDialog}
        onClose={() => setShowConvertDialog(false)}
        lead={lead}
        onSuccess={handleConversionSuccess}
      />
    </>
  );
};
