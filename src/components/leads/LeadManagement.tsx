
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, UserPlus, Mail, Phone, RefreshCw, Filter, Columns } from 'lucide-react';
import { LeadManagementTable } from './LeadManagementTable';
import { LeadFilters } from './LeadFilters';
import { LeadViewToggle } from './LeadViewToggle';
import { LeadCreateDialog } from './LeadCreateDialog';
import { LeadImportDialog } from './LeadImportDialog';
import { LeadColumnManager } from './LeadColumnManager';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { useLeads } from '@/hooks/useLeadManagement';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types/leads';

interface LeadManagementProps {
  className?: string;
}

export const LeadManagement: React.FC<LeadManagementProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const { data: leads, isLoading, refetch } = useLeads();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCreateLead = () => {
    setShowCreateDialog(true);
  };

  const handleImportLeads = () => {
    setShowImportDialog(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleConvertLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowConvertDialog(true);
  };

  const handleImportSuccess = () => {
    setShowImportDialog(false);
    refetch();
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    refetch();
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            type="search"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <LeadFilters />
          <LeadViewToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowColumnManager(true)}>
                <Columns className="mr-2 h-4 w-4" />
                Manage Columns
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={handleCreateLead}>
            Create Lead
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportLeads}>
            Import Leads
          </Button>
        </div>
      </div>

      <LeadManagementTable
        leads={leads || []}
        isLoading={isLoading}
        onRefresh={refetch}
      />

      <ConvertLeadDialog
        isOpen={showConvertDialog}
        onClose={() => setShowConvertDialog(false)}
        lead={selectedLead}
        onSuccess={() => {
          setShowConvertDialog(false);
          refetch();
        }}
      />

      <LeadCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
      />

      <LeadImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      <LeadColumnManager
        open={showColumnManager}
        onClose={() => setShowColumnManager(false)}
      />
    </div>
  );
};
