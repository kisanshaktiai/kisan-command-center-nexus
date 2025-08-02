
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Users, 
  Calendar,
  Plus,
  Send,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useLeadCommunications, useCreateLeadCommunication } from '@/hooks/useLeadCommunications';
import { useNotifications } from '@/hooks/useNotifications';
import type { LeadCommunicationLog } from '@/types/leads';

interface LeadCommunicationCenterProps {
  leadId: string;
  leadName: string;
}

export const LeadCommunicationCenter: React.FC<LeadCommunicationCenterProps> = ({
  leadId,
  leadName,
}) => {
  const { data: communications = [], isLoading } = useLeadCommunications(leadId);
  const createCommunication = useCreateLeadCommunication();
  const { showSuccess, showError } = useNotifications();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    communication_type: 'email' as const,
    direction: 'outbound' as const,
    subject: '',
    content: '',
    status: 'sent',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createCommunication.mutateAsync({
        lead_id: leadId,
        ...formData,
        sent_at: new Date().toISOString(),
        metadata: {},
      } as Omit<LeadCommunicationLog, 'id' | 'created_at'>);
      
      showSuccess('Communication logged successfully');
      setIsDialogOpen(false);
      setFormData({
        communication_type: 'email',
        direction: 'outbound',
        subject: '',
        content: '',
        status: 'sent',
      });
    } catch (error) {
      showError('Failed to log communication');
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'linkedin': return <Users className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="h-4 w-4 text-green-500" />;
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'opened': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'replied': return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
          <MessageSquare className="h-5 w-5" />
          Communications Timeline
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Log Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log Communication with {leadName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select
                    value={formData.communication_type}
                    onValueChange={(value: any) => 
                      setFormData(prev => ({ ...prev, communication_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Direction</label>
                  <Select
                    value={formData.direction}
                    onValueChange={(value: any) => 
                      setFormData(prev => ({ ...prev, direction: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Subject/Title</label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter subject or title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Content/Notes</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter communication content or notes"
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCommunication.isPending}>
                  {createCommunication.isPending ? 'Logging...' : 'Log Communication'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {communications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No communications logged yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {communications.map((comm) => (
              <div key={comm.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getIconForType(comm.communication_type)}
                      <span className="font-medium capitalize">{comm.communication_type}</span>
                    </div>
                    <Badge variant={comm.direction === 'inbound' ? 'secondary' : 'default'}>
                      {comm.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(comm.status)}
                      <span className="text-sm text-gray-500 capitalize">{comm.status}</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(comm.sent_at).toLocaleDateString()} {new Date(comm.sent_at).toLocaleTimeString()}
                  </span>
                </div>
                
                {comm.subject && (
                  <h4 className="font-medium mb-2">{comm.subject}</h4>
                )}
                
                {comm.content && (
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{comm.content}</p>
                )}
                
                {comm.opened_at && (
                  <div className="mt-2 text-sm text-blue-600">
                    Opened: {new Date(comm.opened_at).toLocaleDateString()} {new Date(comm.opened_at).toLocaleTimeString()}
                  </div>
                )}
                
                {comm.replied_at && (
                  <div className="mt-2 text-sm text-green-600">
                    Replied: {new Date(comm.replied_at).toLocaleDateString()} {new Date(comm.replied_at).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
