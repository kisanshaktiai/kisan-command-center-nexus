
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, UserPlus, Mail, Phone } from 'lucide-react';
import { LeadStatusSelect } from './LeadStatusSelect';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import type { Lead } from '@/types/leads';

interface LeadManagementTableProps {
  leads: Lead[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
} as const;

export const LeadManagementTable: React.FC<LeadManagementTableProps> = ({
  leads,
  isLoading,
  onRefresh,
}) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    // You could open a detailed view dialog here
  };

  const handleManualConvert = (lead: Lead) => {
    setSelectedLead(lead);
    setShowConvertDialog(true);
  };

  const handleContactLead = (lead: Lead) => {
    // Handle contact action (open email/phone)
    if (lead.email) {
      window.open(`mailto:${lead.email}`, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No leads found. Create your first lead to get started.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{lead.contact_name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </span>
                        )}
                      </div>
                      {lead.phone && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{lead.organization_name || 'N/A'}</div>
                      {lead.organization_type && (
                        <div className="text-sm text-gray-500 capitalize">
                          {lead.organization_type.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline">{lead.source || 'Unknown'}</Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={priorityColors[lead.priority]} variant="outline">
                      {lead.priority}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <LeadStatusSelect
                      lead={lead}
                      onStatusChange={() => onRefresh?.()}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">
                        {lead.lead_score || lead.qualification_score || 0}
                      </div>
                      <div className="text-xs text-gray-500">/ 100</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-500">
                      {formatDate(lead.created_at)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewLead(lead)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleContactLead(lead)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Contact Lead
                        </DropdownMenuItem>
                        {lead.status === 'qualified' && (
                          <DropdownMenuItem onClick={() => handleManualConvert(lead)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Convert to Tenant
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConvertLeadDialog
        open={showConvertDialog}
        onClose={() => setShowConvertDialog(false)}
        lead={selectedLead}
        onSuccess={() => {
          setShowConvertDialog(false);
          onRefresh?.();
        }}
      />
    </>
  );
};
