
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { LeadManagement } from './LeadManagement';
import { AdvancedLeadManagementDashboard } from './AdvancedLeadManagementDashboard';
import type { Lead } from '@/types/leads';

interface EnhancedLeadManagementProps {
  leads?: Lead[];
  selectedLeads?: string[];
  onSelectionChange?: (leads: string[]) => void;
}

export const EnhancedLeadManagement: React.FC<EnhancedLeadManagementProps> = ({
  leads,
  selectedLeads,
  onSelectionChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>();
  const [selectedLeadName, setSelectedLeadName] = useState<string>();

  return (
    <div className="space-y-6">
      {/* Main Lead Management */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600 mt-1">Manage and track leads through the conversion pipeline</p>
        </div>
        <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Advanced Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Advanced Lead Management Settings</DialogTitle>
            </DialogHeader>
            <AdvancedLeadManagementDashboard 
              selectedLeadId={selectedLeadId}
              selectedLeadName={selectedLeadName}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Keep existing LeadManagement component */}
      <LeadManagement />
    </div>
  );
};
