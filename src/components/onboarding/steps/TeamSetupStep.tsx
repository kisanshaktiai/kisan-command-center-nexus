
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Mail, Trash2, CheckCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'invited' | 'accepted';
}

interface TeamSetupStepProps {
  stepData: any;
  onComplete: (data: any) => void;
  onNext: () => void;
  isCompleted: boolean;
}

export const TeamSetupStep: React.FC<TeamSetupStepProps> = ({
  stepData,
  onComplete,
  onNext,
  isCompleted
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(
    stepData?.team_members || []
  );
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'user'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const roles = [
    { value: 'admin', label: 'Administrator', description: 'Full access to all features' },
    { value: 'manager', label: 'Manager', description: 'Manage users and reports' },
    { value: 'user', label: 'User', description: 'Standard user access' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access' }
  ];

  const addTeamMember = () => {
    if (!newMember.name || !newMember.email) {
      showError('Please fill in all fields');
      return;
    }

    const emailExists = teamMembers.some(member => member.email === newMember.email);
    if (emailExists) {
      showError('Email already exists in team');
      return;
    }

    const member: TeamMember = {
      id: Date.now().toString(),
      ...newMember,
      status: 'pending'
    };

    setTeamMembers(prev => [...prev, member]);
    setNewMember({ name: '', email: '', role: 'user' });
    showSuccess('Team member added');
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
  };

  const sendInvitation = async (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    try {
      // Simulate invitation sending
      setTeamMembers(prev =>
        prev.map(m =>
          m.id === memberId ? { ...m, status: 'invited' } : m
        )
      );
      showSuccess(`Invitation sent to ${member.email}`);
    } catch (error) {
      showError('Failed to send invitation');
    }
  };

  const handleComplete = async () => {
    if (teamMembers.length === 0) {
      showError('Please add at least one team member');
      return;
    }

    setIsLoading(true);
    try {
      const completionData = {
        team_members: teamMembers,
        team_size: teamMembers.length,
        admin_count: teamMembers.filter(m => m.role === 'admin').length,
        setup_completed_at: new Date().toISOString(),
      };

      await onComplete(completionData);
      showSuccess('Team setup completed successfully');
      onNext();
    } catch (error) {
      showError('Failed to complete team setup');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Team Setup - Completed
          </CardTitle>
          <CardDescription>Your team has been set up successfully</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stepData?.team_size || 0}</div>
                <div className="text-sm text-muted-foreground">Team Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stepData?.admin_count || 0}</div>
                <div className="text-sm text-muted-foreground">Administrators</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {stepData?.team_members?.filter((m: any) => m.status === 'accepted').length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </div>
            {stepData?.team_members && (
              <div className="space-y-2">
                <Label>Team Members</Label>
                {stepData.team_members.map((member: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                    <Badge variant={member.status === 'accepted' ? 'default' : 'secondary'}>
                      {member.role} • {member.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Setup
        </CardTitle>
        <CardDescription>
          Invite team members and assign roles to collaborate effectively
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Add Team Member</h4>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="memberName">Full Name</Label>
              <Input
                id="memberName"
                placeholder="John Doe"
                value={newMember.name}
                onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberEmail">Email Address</Label>
              <Input
                id="memberEmail"
                type="email"
                placeholder="john@example.com"
                value={newMember.email}
                onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberRole">Role</Label>
              <Select value={newMember.role} onValueChange={(value) => setNewMember(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addTeamMember} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {teamMembers.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Team Members ({teamMembers.length})</h4>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {roles.find(r => r.value === member.role)?.label}
                    </Badge>
                    <Badge variant={member.status === 'invited' ? 'default' : 'secondary'}>
                      {member.status}
                    </Badge>
                    {member.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendInvitation(member.id)}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Invite
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeTeamMember(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Role Permissions</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {roles.map(role => (
              <div key={role.value} className="text-blue-800">
                <span className="font-medium">{role.label}:</span> {role.description}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleComplete} 
            disabled={isLoading || teamMembers.length === 0}
          >
            {isLoading ? 'Setting up...' : 'Complete Team Setup'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
