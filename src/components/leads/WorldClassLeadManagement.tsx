import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutGrid, 
  List, 
  BarChart3, 
  Search, 
  Filter, 
  Plus, 
  Download,
  AlertTriangle 
} from 'lucide-react';
import { useLeads, useUpdateLeadStatus } from '@/hooks/useLeadManagement';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { DraggableLeadKanban } from '@/components/leads/DraggableLeadKanban';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal } from 'lucide-react';
import { ConvertLeadDialog } from '@/components/leads/ConvertLeadDialog';
import { LeadDetailsDialog } from '@/components/leads/LeadDetailsDialog';
import { TenantVerificationModal } from '@/components/leads/TenantVerificationModal';
import { useToast } from "@/hooks/use-toast"
import { useEnhancedLeads } from '@/hooks/useEnhancedLeadManagement';
import { useLeadValidationWatcher } from '@/hooks/useLeadValidationWatcher';
import type { Lead } from '@/types/leads';
import { LeadConversionValidator } from './LeadConversionValidator';

export const WorldClassLeadManagement: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isTenantVerificationOpen, setIsTenantVerificationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('kanban');
  const { toast } = useToast()

  const { data: leads = [], isLoading, isError } = useEnhancedLeads();
  const { mutate: updateLeadStatus, isLoading: isUpdatingStatus } = useUpdateLeadStatus();

  // Add validation watcher
  const { hasInvalidConversions } = useLeadValidationWatcher(leads);

  const tabs = [
    { id: 'kanban', label: 'Kanban Board', icon: LayoutGrid },
    { id: 'list', label: 'List View', icon: List },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { 
      id: 'validator', 
      label: 'Conversion Validator', 
      icon: AlertTriangle,
      hasIssues: hasInvalidConversions // Add indicator for issues
    },
  ];

  const handleStatusChange = useCallback(
    (leadId: string, newStatus: Lead['status']) => {
      updateLeadStatus({ leadId, status: newStatus });
    },
    [updateLeadStatus]
  );

  const filteredLeads = useMemo(() => {
    const lowerCaseSearch = search.toLowerCase();
    return leads.filter(lead =>
      lead.contact_name.toLowerCase().includes(lowerCaseSearch) ||
      lead.email.toLowerCase().includes(lowerCaseSearch) ||
      (lead.organization_name && lead.organization_name.toLowerCase().includes(lowerCaseSearch))
    );
  }, [leads, search]);

  const handleConversionSuccess = () => {
    toast({
      title: "Lead Converted",
      description: "The lead has been successfully converted to a tenant.",
    })
    setIsTenantVerificationOpen(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'kanban':
        return (
          <DraggableLeadKanban
            leads={leads}
            onLeadSelect={setSelectedLead}
            onStatusChange={handleStatusChange}
            className="min-h-[600px]"
          />
        );
      case 'list':
        return <div>List view implementation</div>;
      case 'analytics':
        return <div>Analytics implementation</div>;
      case 'validator':
        return <LeadConversionValidator className="max-w-6xl mx-auto" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <h1 className="text-lg font-semibold">Leads Management</h1>
          <div className="ml-auto flex items-center space-x-4">
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
            <Button variant="secondary" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id} 
                className="flex items-center gap-2"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.hasIssues && (
                  <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center">
                    !
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="kanban" className="space-y-4">
            {renderTabContent()}
          </TabsContent>
          <TabsContent value="list" className="space-y-4">
            <div>List View Content</div>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <div>Analytics Content</div>
          </TabsContent>
          <TabsContent value="validator" className="space-y-4">
            {renderTabContent()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs and Modals */}
      <LeadDetailsDialog
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        onConvertToTenant={() => setIsConvertDialogOpen(true)}
      />

      <ConvertLeadDialog
        lead={selectedLead}
        isOpen={isConvertDialogOpen}
        onClose={() => setIsConvertDialogOpen(false)}
        onSuccess={handleConversionSuccess}
      />

      <TenantVerificationModal
        isOpen={isTenantVerificationOpen}
        onClose={() => setIsTenantVerificationOpen(false)}
        lead={selectedLead}
        onConversionSuccess={() => {
          setIsTenantVerificationOpen(false);
          setSelectedLead(null);
        }}
      />
    </div>
  );
};
