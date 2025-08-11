
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Edit, 
  UserPlus,
  Mail,
  Phone,
  Building,
  Calendar,
  Star,
  Zap
} from 'lucide-react';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { LeadStatusSelect } from './LeadStatusSelect';
import type { Lead } from '@/types/leads';

interface LeadTableViewProps {
  leads: Lead[];
  isLoading: boolean;
  selectedLeads: string[];
  onSelectionChange: (leadIds: string[]) => void;
  onRefresh: () => void;
}

type SortField = 'contact_name' | 'email' | 'organization_name' | 'status' | 'priority' | 'created_at' | 'qualification_score';
type SortDirection = 'asc' | 'desc';

const statusColors = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  assigned: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  contacted: 'bg-purple-100 text-purple-800 border-purple-200',
  qualified: 'bg-green-100 text-green-800 border-green-200',
  converted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
} as const;

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
} as const;

export const LeadTableView: React.FC<LeadTableViewProps> = ({
  leads,
  isLoading,
  selectedLeads,
  onSelectionChange,
  onRefresh
}) => {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const sortedLeads = useMemo(() => {
    if (!leads?.length) return [];
    
    return [...leads].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [leads, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(leads.map(lead => lead.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedLeads, leadId]);
    } else {
      onSelectionChange(selectedLeads.filter(id => id !== leadId));
    }
  };

  const handleConvertLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowConvertDialog(true);
  };

  const handleConvertSuccess = () => {
    setShowConvertDialog(false);
    setSelectedLead(null);
    onRefresh();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 font-semibold text-gray-700 hover:bg-blue-50"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="ml-2 h-3 w-3" />
        ) : (
          <ArrowDown className="ml-2 h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
      )}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 bg-gray-200 rounded w-8"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;
  const someSelected = selectedLeads.length > 0 && selectedLeads.length < leads.length;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
        {/* Header with Bulk Actions */}
        {selectedLeads.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">
                {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Bulk Assign
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-50/50">
                <TableHead className="w-12 px-6 py-4">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onCheckedChange={handleSelectAll}
                    className="border-2 border-gray-300"
                  />
                </TableHead>
                <TableHead className="px-4 py-4">
                  <SortButton field="contact_name">Contact</SortButton>
                </TableHead>
                <TableHead className="px-4 py-4">
                  <SortButton field="organization_name">Organization</SortButton>
                </TableHead>
                <TableHead className="px-4 py-4">
                  <SortButton field="status">Status</SortButton>
                </TableHead>
                <TableHead className="px-4 py-4">
                  <SortButton field="priority">Priority</SortButton>
                </TableHead>
                <TableHead className="px-4 py-4">
                  <SortButton field="qualification_score">Score</SortButton>
                </TableHead>
                <TableHead className="px-4 py-4">
                  <SortButton field="created_at">Created</SortButton>
                </TableHead>
                <TableHead className="px-4 py-4 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLeads.map((lead, index) => (
                <TableRow 
                  key={lead.id} 
                  className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors duration-200 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <TableCell className="px-6 py-4">
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                      className="border-2 border-gray-300"
                    />
                  </TableCell>
                  
                  <TableCell className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-900">{lead.contact_name}</div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="h-3 w-3 mr-1" />
                        {lead.email}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="h-3 w-3 mr-1" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-4">
                    {lead.organization_name ? (
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium text-gray-900">{lead.organization_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No organization</span>
                    )}
                  </TableCell>

                  <TableCell className="px-4 py-4">
                    <LeadStatusSelect 
                      lead={lead} 
                      onStatusChange={() => onRefresh()}
                    />
                  </TableCell>

                  <TableCell className="px-4 py-4">
                    <Badge className={`${priorityColors[lead.priority]} font-medium border`}>
                      {lead.priority.toUpperCase()}
                    </Badge>
                  </TableCell>

                  <TableCell className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-semibold text-gray-900">
                          {lead.qualification_score}
                        </span>
                      </div>
                      {lead.qualification_score >= 80 && (
                        <Zap className="h-4 w-4 text-green-500" title="High quality lead" />
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(lead.created_at)}
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-4">
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                        title="Edit Lead"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {lead.status === 'qualified' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConvertLead(lead)}
                          className="h-8 px-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 text-xs font-medium"
                          title="Convert to Tenant"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Convert
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {leads.length === 0 && (
          <div className="p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
                <Building className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No leads found</h3>
              <p className="text-gray-500">Try adjusting your filters or create a new lead.</p>
            </div>
          </div>
        )}
      </div>

      <ConvertLeadDialog
        isOpen={showConvertDialog}
        onClose={() => setShowConvertDialog(false)}
        lead={selectedLead}
        onSuccess={handleConvertSuccess}
      />
    </>
  );
};
