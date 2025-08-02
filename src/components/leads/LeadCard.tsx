
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Mail, 
  Phone, 
  Building2, 
  User, 
  Calendar,
  MoreHorizontal,
  UserCheck,
  ArrowRight,
  Star,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LeadStatusSelect } from './LeadStatusSelect';
import { useUpdateLeadStatus } from '@/hooks/useLeadManagement';
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const updateStatusMutation = useUpdateLeadStatus();

  const getStatusBadgeVariant = (status: Lead['status']) => {
    switch (status) {
      case 'new':
        return 'secondary';
      case 'assigned':
        return 'outline';
      case 'contacted':
        return 'default';
      case 'qualified':
        return 'default';
      case 'converted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleStatusChange = async (newStatus: Lead['status']) => {
    if (newStatus === lead.status) return;
    
    setIsUpdatingStatus(true);
    
    try {
      await updateStatusMutation.mutateAsync({
        leadId: lead.id,
        status: newStatus,
        notes: `Status changed from ${lead.status} to ${newStatus}`
      });
      
      toast.success(`Lead status updated to ${newStatus}`);
      onUpdateStatus(lead.id, newStatus);
    } catch (error: any) {
      console.error('Error updating lead status:', error);
      toast.error(`Failed to update status: ${error.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Only qualified leads can be converted to tenants
  const canConvert = lead.status === 'qualified';

  const getConversionTooltip = () => {
    if (lead.status === 'converted') {
      return 'This lead has already been converted to a tenant';
    }
    if (lead.status === 'rejected') {
      return 'Rejected leads cannot be converted';
    }
    if (lead.status !== 'qualified') {
      return 'Lead must be qualified before conversion to tenant';
    }
    return 'Convert this qualified lead to a tenant';
  };

  return (
    <Card className={`relative transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                className="mt-1"
              />
            )}
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                {lead.contact_name}
                <Star className={`h-3 w-3 ${getPriorityColor(lead.priority)}`} />
              </CardTitle>
              {lead.organization_name && (
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3" />
                  {lead.organization_name}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onReassign(lead.id)}>
                <UserCheck className="h-4 w-4 mr-2" />
                Reassign
              </DropdownMenuItem>
              {canConvert && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onConvert(lead.id)}
                    title={getConversionTooltip()}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Convert to Tenant
                  </DropdownMenuItem>
                </>
              )}
              {!canConvert && lead.status !== 'converted' && lead.status !== 'rejected' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    disabled
                    title={getConversionTooltip()}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Convert to Tenant
                    <span className="ml-2 text-xs text-gray-400">(Qualify first)</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <LeadStatusSelect
            currentStatus={lead.status}
            onStatusChange={handleStatusChange}
            disabled={isUpdatingStatus || updateStatusMutation.isPending}
          />
          <Badge variant="outline" className="text-xs">
            Score: {lead.lead_score || lead.qualification_score || 0}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="h-3 w-3" />
            <span className="truncate">{lead.email}</span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-3 w-3" />
              <span>{lead.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>Created {new Date(lead.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {lead.notes && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
            <p className="line-clamp-2">{lead.notes}</p>
          </div>
        )}

        {lead.assigned_admin && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <UserCheck className="h-3 w-3" />
            <span>Assigned to {lead.assigned_admin.full_name}</span>
          </div>
        )}

        {isUpdatingStatus && (
          <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
            <AlertCircle className="h-3 w-3 animate-spin" />
            <span>Updating status...</span>
          </div>
        )}

        {/* Show qualification guidance for non-qualified leads */}
        {!canConvert && lead.status !== 'converted' && lead.status !== 'rejected' && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <AlertCircle className="h-3 w-3" />
            <span>
              {lead.status === 'new' && 'Assign and contact this lead to begin qualification process'}
              {lead.status === 'assigned' && 'Contact this lead to begin qualification process'}
              {lead.status === 'contacted' && 'Complete qualification to enable tenant conversion'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
