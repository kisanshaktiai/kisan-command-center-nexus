
import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Download,
  UserPlus,
  Eye,
  Edit,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import type { Lead } from '@/types/leads';

interface LeadTableViewProps {
  leads: Lead[];
  isLoading: boolean;
  selectedLeads: string[];
  onSelectionChange: (selectedLeads: string[]) => void;
  onRefresh: () => void;
}

type SortField = 'contact_name' | 'email' | 'organization_name' | 'status' | 'priority' | 'created_at' | 'qualification_score';
type SortDirection = 'asc' | 'desc';

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New', variant: 'secondary' as const },
  { value: 'assigned', label: 'Assigned', variant: 'outline' as const },
  { value: 'contacted', label: 'Contacted', variant: 'default' as const },
  { value: 'qualified', label: 'Qualified', variant: 'default' as const },
  { value: 'converted', label: 'Converted', variant: 'default' as const },
  { value: 'rejected', label: 'Rejected', variant: 'destructive' as const },
];

const priorityOptions = [
  { value: 'all', label: 'All Priority' },
  { value: 'low', label: 'Low', variant: 'outline' as const },
  { value: 'medium', label: 'Medium', variant: 'default' as const },
  { value: 'high', label: 'High', variant: 'default' as const },
  { value: 'urgent', label: 'Urgent', variant: 'destructive' as const },
];

const getStatusIcon = (status: Lead['status']) => {
  switch (status) {
    case 'new': return <Clock className="h-3 w-3" />;
    case 'assigned': return <UserPlus className="h-3 w-3" />;
    case 'contacted': return <Eye className="h-3 w-3" />;
    case 'qualified': return <CheckCircle2 className="h-3 w-3" />;
    case 'converted': return <CheckCircle2 className="h-3 w-3" />;
    case 'rejected': return <XCircle className="h-3 w-3" />;
    default: return <AlertTriangle className="h-3 w-3" />;
  }
};

const getStatusColor = (status: Lead['status']) => {
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'assigned': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'contacted': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'qualified': return 'bg-green-100 text-green-800 border-green-200';
    case 'converted': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityColor = (priority: Lead['priority']) => {
  switch (priority) {
    case 'low': return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

export const LeadTableView: React.FC<LeadTableViewProps> = ({ 
  leads, 
  isLoading, 
  selectedLeads, 
  onSelectionChange, 
  onRefresh 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedLeadForConversion, setSelectedLeadForConversion] = useState<Lead | null>(null);

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = leads.filter((lead) => {
      const matchesSearch = 
        lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.organization_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Sort leads
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [leads, searchTerm, statusFilter, priorityFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleSelectLead = (leadId: string) => {
    const newSelection = selectedLeads.includes(leadId) 
      ? selectedLeads.filter(id => id !== leadId)
      : [...selectedLeads, leadId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredAndSortedLeads.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredAndSortedLeads.map(lead => lead.id));
    }
  };

  const allSelected = selectedLeads.length === filteredAndSortedLeads.length && filteredAndSortedLeads.length > 0;
  const someSelected = selectedLeads.length > 0 && selectedLeads.length < filteredAndSortedLeads.length;

  const handleConvertLead = (lead: Lead) => {
    setSelectedLeadForConversion(lead);
    setConvertDialogOpen(true);
  };

  const handleConversionSuccess = () => {
    setConvertDialogOpen(false);
    setSelectedLeadForConversion(null);
    onRefresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Status
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {statusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={statusFilter === option.value ? 'bg-blue-50' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Priority
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {priorityOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setPriorityFilter(option.value)}
                    className={priorityFilter === option.value ? 'bg-blue-50' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          {selectedLeads.length > 0 && (
            <Button variant="default" size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Bulk Actions ({selectedLeads.length})
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="w-12 px-4">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      const input = el.querySelector('input') as HTMLInputElement;
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                  className="border-2 border-gray-300"
                />
              </TableHead>
              <TableHead className="px-4">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('contact_name')}
                  className="h-auto p-0 font-semibold text-left justify-start gap-2"
                >
                  Contact
                  {getSortIcon('contact_name')}
                </Button>
              </TableHead>
              <TableHead className="px-4">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('organization_name')}
                  className="h-auto p-0 font-semibold text-left justify-start gap-2"
                >
                  Organization
                  {getSortIcon('organization_name')}
                </Button>
              </TableHead>
              <TableHead className="px-4">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('status')}
                  className="h-auto p-0 font-semibold text-left justify-start gap-2"
                >
                  Status
                  {getSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead className="px-4">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('priority')}
                  className="h-auto p-0 font-semibold text-left justify-start gap-2"
                >
                  Priority
                  {getSortIcon('priority')}
                </Button>
              </TableHead>
              <TableHead className="px-4">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('qualification_score')}
                  className="h-auto p-0 font-semibold text-left justify-start gap-2"
                >
                  Score
                  {getSortIcon('qualification_score')}
                </Button>
              </TableHead>
              <TableHead className="px-4">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('created_at')}
                  className="h-auto p-0 font-semibold text-left justify-start gap-2"
                >
                  Created
                  {getSortIcon('created_at')}
                </Button>
              </TableHead>
              <TableHead className="px-4 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLeads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-gray-50">
                <TableCell className="px-4 py-4">
                  <Checkbox
                    checked={selectedLeads.includes(lead.id)}
                    onCheckedChange={() => handleSelectLead(lead.id)}
                    className="border-2 border-gray-300"
                  />
                </TableCell>

                <TableCell className="px-4 py-4">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{lead.contact_name}</div>
                    <div className="text-sm text-gray-500">{lead.email}</div>
                    {lead.phone && (
                      <div className="text-sm text-gray-500">{lead.phone}</div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="px-4 py-4">
                  <div className="font-medium text-gray-900">
                    {lead.organization_name || 'N/A'}
                  </div>
                </TableCell>

                <TableCell className="px-4 py-4">
                  <Badge variant="outline" className={`${getStatusColor(lead.status)} gap-1`}>
                    {getStatusIcon(lead.status)}
                    {lead.status}
                  </Badge>
                </TableCell>

                <TableCell className="px-4 py-4">
                  <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                    {lead.priority}
                  </Badge>
                </TableCell>

                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">
                          {lead.qualification_score}%
                        </span>
                      </div>
                    </div>
                    {lead.qualification_score >= 80 && (
                      <div className="relative group">
                        <Zap className="h-4 w-4 text-green-500" />
                        <div className="absolute invisible group-hover:visible bg-black text-white text-xs rounded px-2 py-1 -top-8 -left-4 whitespace-nowrap z-10">
                          High quality lead
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="px-4 py-4">
                  <div className="text-sm text-gray-600">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </TableCell>

                <TableCell className="px-4 py-4">
                  <div className="flex items-center justify-center space-x-1">
                    <div className="relative group">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <div className="absolute invisible group-hover:visible bg-black text-white text-xs rounded px-2 py-1 -top-8 -left-4 whitespace-nowrap z-10">
                        View Details
                      </div>
                    </div>
                    <div className="relative group">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <div className="absolute invisible group-hover:visible bg-black text-white text-xs rounded px-2 py-1 -top-8 -left-4 whitespace-nowrap z-10">
                        Edit Lead
                      </div>
                    </div>
                    {lead.status === 'qualified' && (
                      <div className="relative group">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConvertLead(lead)}
                          className="h-8 px-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 text-xs font-medium"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Convert
                        </Button>
                        <div className="absolute invisible group-hover:visible bg-black text-white text-xs rounded px-2 py-1 -top-8 -left-4 whitespace-nowrap z-10">
                          Convert to Tenant
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredAndSortedLeads.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No leads found matching your criteria.</div>
          </div>
        )}
      </div>

      {/* Convert Lead Dialog */}
      <ConvertLeadDialog
        isOpen={convertDialogOpen}
        onClose={() => {
          setConvertDialogOpen(false);
          setSelectedLeadForConversion(null);
        }}
        lead={selectedLeadForConversion}
        onSuccess={handleConversionSuccess}
      />
    </div>
  );
};
