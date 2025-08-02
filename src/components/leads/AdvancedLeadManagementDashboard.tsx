
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings, 
  Target, 
  Users, 
  MessageSquare,
  BarChart3,
  Tag
} from 'lucide-react';
import { LeadScoringRulesManager } from './LeadScoringRulesManager';
import { LeadAssignmentRulesManager } from './LeadAssignmentRulesManager';
import { LeadCommunicationCenter } from './LeadCommunicationCenter';
import { LeadAnalyticsDashboard } from './LeadAnalyticsDashboard';

interface AdvancedLeadManagementDashboardProps {
  selectedLeadId?: string;
  selectedLeadName?: string;
}

export const AdvancedLeadManagementDashboard: React.FC<AdvancedLeadManagementDashboardProps> = ({
  selectedLeadId,
  selectedLeadName,
}) => {
  const [activeTab, setActiveTab] = useState('scoring-rules');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Lead Management</h2>
          <p className="text-gray-600 mt-1">Configure scoring rules, assignment logic, and track communications</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scoring-rules" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Scoring Rules
          </TabsTrigger>
          <TabsTrigger value="assignment-rules" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignment Rules
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-2" disabled={!selectedLeadId}>
            <MessageSquare className="h-4 w-4" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scoring-rules" className="space-y-6">
          <LeadScoringRulesManager />
        </TabsContent>

        <TabsContent value="assignment-rules" className="space-y-6">
          <LeadAssignmentRulesManager />
        </TabsContent>

        <TabsContent value="communications" className="space-y-6">
          {selectedLeadId && selectedLeadName ? (
            <LeadCommunicationCenter 
              leadId={selectedLeadId} 
              leadName={selectedLeadName}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Select a lead to view communications</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <LeadAnalyticsDashboard open={true} onClose={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
