
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadAutoAssignmentTester } from './LeadAutoAssignmentTester';
import { LeadAssignmentRulesManager } from './LeadAssignmentRulesManager';
import { LeadScoringRulesManager } from './LeadScoringRulesManager';
import { LeadAnalyticsDashboard } from './LeadAnalyticsDashboard';
import { LeadTagManager } from './LeadTagManager';
import { LeadCommunicationCenter } from './LeadCommunicationCenter';

interface AdvancedLeadManagementDashboardProps {
  selectedLeadId?: string;
  selectedLeadName?: string;
}

export const AdvancedLeadManagementDashboard: React.FC<AdvancedLeadManagementDashboardProps> = ({
  selectedLeadId,
  selectedLeadName
}) => {
  const [activeTab, setActiveTab] = useState('auto-assignment');

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Advanced Lead Management
        </h2>
        <p className="text-gray-600">
          Comprehensive tools for managing lead assignment, scoring, and analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="auto-assignment">Auto-Assignment</TabsTrigger>
          <TabsTrigger value="assignment-rules">Assignment Rules</TabsTrigger>
          <TabsTrigger value="scoring-rules">Scoring Rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tags">Tag Manager</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value="auto-assignment" className="mt-6">
          <LeadAutoAssignmentTester />
        </TabsContent>

        <TabsContent value="assignment-rules" className="mt-6">
          <LeadAssignmentRulesManager />
        </TabsContent>

        <TabsContent value="scoring-rules" className="mt-6">
          <LeadScoringRulesManager />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <LeadAnalyticsDashboard detailed />
        </TabsContent>

        <TabsContent value="tags" className="mt-6">
          <LeadTagManager leadId={selectedLeadId || ''} />
        </TabsContent>

        <TabsContent value="communication" className="mt-6">
          {selectedLeadId ? (
            <LeadCommunicationCenter 
              leadId={selectedLeadId}
              leadName={selectedLeadName || 'Unknown Lead'}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Please select a lead to view communication center</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
