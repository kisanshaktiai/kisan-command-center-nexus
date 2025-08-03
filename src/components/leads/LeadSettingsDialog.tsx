
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Users, 
  Zap, 
  Bell, 
  Shield,
  Workflow,
  Target,
  Clock
} from 'lucide-react';

interface LeadSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const LeadSettingsDialog: React.FC<LeadSettingsDialogProps> = ({
  open,
  onClose,
}) => {
  const [settings, setSettings] = useState({
    // Auto-assignment settings
    enableAutoAssignment: true,
    assignmentMethod: 'round_robin',
    autoAssignOnCreate: true,
    
    // Notifications
    emailNotifications: true,
    statusChangeNotifications: true,
    assignmentNotifications: true,
    
    // Lead scoring
    enableLeadScoring: true,
    autoCalculateScore: true,
    scoringThreshold: 70,
    
    // Follow-up reminders
    enableFollowUpReminders: true,
    defaultFollowUpDays: 3,
    escalationDays: 7,
    
    // Data retention
    dataRetentionDays: 365,
    autoArchiveRejected: true,
    
    // Security
    enableAuditLog: true,
    requireStatusNotes: false,
  });

  const handleSave = async () => {
    // Save settings to backend
    console.log('Saving settings:', settings);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Lead Management Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="assignment" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="assignment" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assignment
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Scoring
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignment" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Auto-Assignment Rules</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableAutoAssignment">Enable Auto-Assignment</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically assign new leads to available team members
                  </p>
                </div>
                <Switch
                  id="enableAutoAssignment"
                  checked={settings.enableAutoAssignment}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableAutoAssignment: checked }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="assignmentMethod">Assignment Method</Label>
                <select
                  id="assignmentMethod"
                  value={settings.assignmentMethod}
                  onChange={(e) => setSettings(prev => ({ ...prev, assignmentMethod: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="round_robin">Round Robin</option>
                  <option value="load_balanced">Load Balanced</option>
                  <option value="skill_based">Skill Based</option>
                  <option value="territory">Territory Based</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoAssignOnCreate">Assign on Creation</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Assign leads immediately when created
                  </p>
                </div>
                <Switch
                  id="autoAssignOnCreate"
                  checked={settings.autoAssignOnCreate}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, autoAssignOnCreate: checked }))
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scoring" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Lead Scoring Configuration</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableLeadScoring">Enable Lead Scoring</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically calculate lead scores based on criteria
                  </p>
                </div>
                <Switch
                  id="enableLeadScoring"
                  checked={settings.enableLeadScoring}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableLeadScoring: checked }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="scoringThreshold">Qualification Threshold</Label>
                <Input
                  id="scoringThreshold"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.scoringThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, scoringThreshold: parseInt(e.target.value) }))}
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Leads above this score are automatically qualified
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoCalculateScore">Auto-Calculate Scores</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Recalculate scores when lead data changes
                  </p>
                </div>
                <Switch
                  id="autoCalculateScore"
                  checked={settings.autoCalculateScore}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, autoCalculateScore: checked }))
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notification Preferences</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Send email notifications for important events
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="statusChangeNotifications">Status Changes</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Notify when lead status changes
                  </p>
                </div>
                <Switch
                  id="statusChangeNotifications"
                  checked={settings.statusChangeNotifications}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, statusChangeNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="assignmentNotifications">Assignment Changes</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Notify when leads are assigned or reassigned
                  </p>
                </div>
                <Switch
                  id="assignmentNotifications"
                  checked={settings.assignmentNotifications}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, assignmentNotifications: checked }))
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Automation Rules</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableFollowUpReminders">Follow-up Reminders</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically create follow-up reminders
                  </p>
                </div>
                <Switch
                  id="enableFollowUpReminders"
                  checked={settings.enableFollowUpReminders}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableFollowUpReminders: checked }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultFollowUpDays">Default Follow-up Days</Label>
                  <Input
                    id="defaultFollowUpDays"
                    type="number"
                    min="1"
                    value={settings.defaultFollowUpDays}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultFollowUpDays: parseInt(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="escalationDays">Escalation Days</Label>
                  <Input
                    id="escalationDays"
                    type="number"
                    min="1"
                    value={settings.escalationDays}
                    onChange={(e) => setSettings(prev => ({ ...prev, escalationDays: parseInt(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoArchiveRejected">Auto-Archive Rejected</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically archive rejected leads after retention period
                  </p>
                </div>
                <Switch
                  id="autoArchiveRejected"
                  checked={settings.autoArchiveRejected}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, autoArchiveRejected: checked }))
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Security & Compliance</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableAuditLog">Enable Audit Log</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Track all lead management activities
                  </p>
                </div>
                <Switch
                  id="enableAuditLog"
                  checked={settings.enableAuditLog}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableAuditLog: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requireStatusNotes">Require Status Notes</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Require notes when changing lead status
                  </p>
                </div>
                <Switch
                  id="requireStatusNotes"
                  checked={settings.requireStatusNotes}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, requireStatusNotes: checked }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="dataRetentionDays">Data Retention (Days)</Label>
                <Input
                  id="dataRetentionDays"
                  type="number"
                  min="30"
                  value={settings.dataRetentionDays}
                  onChange={(e) => setSettings(prev => ({ ...prev, dataRetentionDays: parseInt(e.target.value) }))}
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  How long to keep lead data before archival
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
