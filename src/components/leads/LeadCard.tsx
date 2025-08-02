
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MoreHorizontal, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  ArrowRight,
  Thermometer,
  Star,
  Activity
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const getStatusColor = (status: Lead['status']) => {
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'contacted': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'qualified': return 'bg-green-100 text-green-800 border-green-200';
    case 'converted': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityColor = (priority: Lead['priority']) => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTemperatureColor = (temperature?: string) => {
  switch (temperature) {
    case 'hot': return 'text-red-500';
    case 'warm': return 'text-orange-500';
    case 'cold': return 'text-blue-500';
    default: return 'text-gray-400';
  }
};

export const LeadCard: React.FC<LeadCardProps> = ({ 
  lead, 
  onReassign, 
  onUpdateStatus, 
  onConvert,
  isSelected = false,
  onSelect
}) => {
  const updateStatusMutation = useUpdateLeadStatus();

  const handleStatusUpdate = (status: Lead['status']) => {
    updateStatusMutation.mutate({ leadId: lead.id, status });
    onUpdateStatus(lead.id, status);
  };

  return (
    <Card className={`hover:shadow-md transition-all duration-200 border ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
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
            <CardTitle className="text-lg font-semibold text-gray-900">
              {lead.contact_name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {lead.lead_temperature && (
              <Thermometer className={`h-4 w-4 ${getTemperatureColor(lead.lead_temperature)}`} />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hover:bg-gray-100"
                  disabled={updateStatusMutation.isPending}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onReassign(lead.id)}>
                  <User className="h-4 w-4 mr-2" />
                  Reassign Lead
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleStatusUpdate('contacted')}>
                  Mark as Contacted
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusUpdate('qualified')}>
                  Mark as Qualified
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusUpdate('rejected')}>
                  Mark as Rejected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {lead.status === 'qualified' && (
                  <DropdownMenuItem onClick={() => onConvert(lead.id)}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Convert to Tenant
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge className={`${getStatusColor(lead.status)} transition-all duration-200`}>
            {lead.status}
          </Badge>
          <Badge className={`${getPriorityColor(lead.priority)} transition-all duration-200`}>
            {lead.priority}
          </Badge>
          {lead.marketing_qualified && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              MQL
            </Badge>
          )}
          {lead.sales_qualified && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              SQL
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="h-4 w-4 text-gray-400" />
          <span>{lead.email}</span>
        </div>
        
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4 text-gray-400" />
            <span>{lead.phone}</span>
          </div>
        )}
        
        {lead.organization_name && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building className="h-4 w-4 text-gray-400" />
            <span>{lead.organization_name}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>Created: {new Date(lead.created_at).toLocaleDateString()}</span>
        </div>

        {/* Lead Score */}
        {(lead.lead_score || 0) > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              Lead Score:
            </span>
            <Badge variant="outline" className="font-mono">
              {lead.lead_score}/100
            </Badge>
          </div>
        )}

        {/* Qualification Score */}
        {lead.qualification_score > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Qualification Score:</span>
            <Badge variant="outline" className="font-mono">
              {lead.qualification_score}/100
            </Badge>
          </div>
        )}

        {/* Progress Indicators */}
        <div className="flex items-center gap-1 text-xs">
          {lead.demo_scheduled && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              Demo Scheduled
            </Badge>
          )}
          {lead.proposal_sent && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700">
              Proposal Sent
            </Badge>
          )}
          {lead.contract_sent && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Contract Sent
            </Badge>
          )}
        </div>

        {/* Last Activity */}
        {lead.last_activity && (
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
            <span className="text-gray-600 flex items-center gap-1">
              <Activity className="h-4 w-4" />
              Last Activity:
            </span>
            <span className="text-gray-900">
              {new Date(lead.last_activity).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Assignment Info */}
        {lead.assigned_to && (
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
            <span className="text-gray-600">Assigned to:</span>
            <span className="font-medium text-gray-900">
              Admin {lead.assigned_to.slice(0, 8)}...
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
