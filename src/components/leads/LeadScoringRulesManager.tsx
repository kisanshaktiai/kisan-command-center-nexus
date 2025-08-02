
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target, 
  TrendingUp,
  User,
  Activity,
  Building
} from 'lucide-react';
import { useLeadScoringRules, useCreateScoringRule, useUpdateScoringRule, useDeleteScoringRule } from '@/hooks/useLeadScoringRules';
import { useNotifications } from '@/hooks/useNotifications';
import type { LeadScoringRule } from '@/types/leads';

export const LeadScoringRulesManager: React.FC = () => {
  const { data: rules = [], isLoading } = useLeadScoringRules();
  const createRule = useCreateScoringRule();
  const updateRule = useUpdateScoringRule();
  const deleteRule = useDeleteScoringRule();
  const { showSuccess, showError } = useNotifications();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LeadScoringRule | null>(null);
  const [formData, setFormData] = useState<{
    rule_name: string;
    rule_type: 'demographic' | 'behavioral' | 'engagement' | 'company';
    score_value: number;
    is_active: boolean;
    conditions: Record<string, any>;
  }>({
    rule_name: '',
    rule_type: 'demographic',
    score_value: 10,
    is_active: true,
    conditions: {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRule) {
        await updateRule.mutateAsync({
          id: editingRule.id,
          updates: formData,
        });
        showSuccess('Scoring rule updated successfully');
      } else {
        await createRule.mutateAsync(formData);
        showSuccess('Scoring rule created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingRule(null);
      resetForm();
    } catch (error) {
      showError('Failed to save scoring rule');
    }
  };

  const handleEdit = (rule: LeadScoringRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      score_value: rule.score_value,
      is_active: rule.is_active,
      conditions: rule.conditions,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this scoring rule?')) {
      try {
        await deleteRule.mutateAsync(id);
        showSuccess('Scoring rule deleted successfully');
      } catch (error) {
        showError('Failed to delete scoring rule');
      }
    }
  };

  const handleToggleActive = async (rule: LeadScoringRule) => {
    try {
      await updateRule.mutateAsync({
        id: rule.id,
        updates: { is_active: !rule.is_active },
      });
      showSuccess(`Rule ${rule.is_active ? 'disabled' : 'enabled'} successfully`);
    } catch (error) {
      showError('Failed to update rule status');
    }
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      rule_type: 'demographic',
      score_value: 10,
      is_active: true,
      conditions: {},
    });
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'demographic': return <User className="h-4 w-4" />;
      case 'behavioral': return <Activity className="h-4 w-4" />;
      case 'engagement': return <TrendingUp className="h-4 w-4" />;
      case 'company': return <Building className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'demographic': return 'bg-blue-500';
      case 'behavioral': return 'bg-green-500';
      case 'engagement': return 'bg-purple-500';
      case 'company': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
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
          <Target className="h-5 w-5" />
          Lead Scoring Rules
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingRule(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Scoring Rule' : 'Create Scoring Rule'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    <SelectItem value="demographic">Demographic</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Score Value</label>
                <Input
                  type="number"
                  value={formData.score_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, score_value: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter score value"
                  required
                />
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
                  disabled={createRule.isPending || updateRule.isPending}
                >
                  {editingRule ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No scoring rules configured yet</p>
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
                        {rule.rule_type}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        +{rule.score_value} points
                      </span>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => handleToggleActive(rule)}
                    disabled={updateRule.isPending}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(rule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(rule.id)}
                    disabled={deleteRule.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
