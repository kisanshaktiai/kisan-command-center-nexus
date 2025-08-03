
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  RotateCcw,
  MapPin,
  Brain,
  Scale
} from 'lucide-react';
import { useLeadAssignmentRules, useCreateAssignmentRule } from '@/hooks/useLeadManagement';
import { useLeadService } from '@/hooks/useLeadService';
import { useNotifications } from '@/hooks/useNotifications';
import type { LeadAssignmentRule } from '@/types/leads';

export const LeadAssignmentRulesManager: React.FC = () => {
  const { data: rules = [], isLoading } = useLeadAssignmentRules();
  const createRule = useCreateAssignmentRule();
  const { getAdminUsers } = useLeadService();
  const { showSuccess, showError } = useNotifications();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'round_robin' as const,
    admin_pool: [] as string[],
    priority_order: 1,
    is_active: true,
    conditions: {},
  });

  React.useEffect(() => {
    const fetchAdmins = async () => {
      const users = await getAdminUsers();
      setAdminUsers(users);
    };
    fetchAdmins();
  }, [getAdminUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.admin_pool.length === 0) {
      showError('Please select at least one admin user');
      return;
    }
    
    try {
      await createRule.mutateAsync(formData);
      showSuccess('Assignment rule created successfully');
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      showError('Failed to create assignment rule');
    }
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      rule_type: 'round_robin',
      admin_pool: [],
      priority_order: 1,
      is_active: true,
      conditions: {},
    });
  };

  const handleAdminToggle = (adminId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      admin_pool: checked 
        ? [...prev.admin_pool, adminId]
        : prev.admin_pool.filter(id => id !== adminId)
    }));
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'round_robin': return <RotateCcw className="h-4 w-4" />;
      case 'load_balanced': return <Scale className="h-4 w-4" />;
      case 'territory': return <MapPin className="h-4 w-4" />;
      case 'skill_based': return <Brain className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'round_robin': return 'bg-blue-500';
      case 'load_balanced': return 'bg-green-500';
      case 'territory': return 'bg-orange-500';
      case 'skill_based': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getAdminName = (adminId: string) => {
    const admin = adminUsers.find(u => u.id === adminId);
    return admin ? admin.full_name : 'Unknown User';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Assignment Rules
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Assignment Rule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Rule Name</label>
                  <Input
                    value={formData.rule_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, rule_name: e.target.value }))}
                    placeholder="Enter rule name"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Rule Type</label>
                  <Select
                    value={formData.rule_type}
                    onValueChange={(value: any) => 
                      setFormData(prev => ({ ...prev, rule_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round_robin">Round Robin</SelectItem>
                      <SelectItem value="load_balanced">Load Balanced</SelectItem>
                      <SelectItem value="territory">Territory Based</SelectItem>
                      <SelectItem value="skill_based">Skill Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Priority Order</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.priority_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority_order: parseInt(e.target.value) || 1 }))}
                  placeholder="Enter priority (1 = highest)"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Admin Pool</label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {adminUsers.length === 0 ? (
                    <p className="text-gray-500 text-sm">No admin users available</p>
                  ) : (
                    <div className="space-y-2">
                      {adminUsers.map((admin) => (
                        <div key={admin.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={admin.id}
                            checked={formData.admin_pool.includes(admin.id)}
                            onCheckedChange={(checked) => handleAdminToggle(admin.id, checked as boolean)}
                          />
                          <label
                            htmlFor={admin.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {admin.full_name} ({admin.email})
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {formData.admin_pool.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.admin_pool.length} admin(s) selected
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <label className="text-sm font-medium">Active</label>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRule.isPending}
                >
                  Create Rule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No assignment rules configured yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full text-white ${getRuleTypeColor(rule.rule_type)}`}>
                    {getRuleTypeIcon(rule.rule_type)}
                  </div>
                  <div>
                    <h3 className="font-medium">{rule.rule_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {rule.rule_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Priority: {rule.priority_order}
                      </span>
                      <span className="text-sm text-gray-500">
                        Admins: {rule.admin_pool?.length || 0}
                      </span>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
