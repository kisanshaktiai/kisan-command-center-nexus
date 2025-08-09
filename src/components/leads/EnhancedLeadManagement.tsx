
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { LeadManagement } from './LeadManagement';
import { AdvancedLeadManagementDashboard } from './AdvancedLeadManagementDashboard';

export const EnhancedLeadManagement: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>();
  const [selectedLeadName, setSelectedLeadName] = useState<string>();

  return (
    <div className="space-y-6">
      {/* Compact Header - matching project design */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground text-sm">Manage and track leads through the conversion pipeline</p>
        </div>
        <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
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
