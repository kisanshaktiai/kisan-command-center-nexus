import React, { useState, useCallback } from 'react';
import {
  Crown,
  Upload,
  Settings,
  Plus,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon } from "@radix-ui/react-icons"

const leadsData = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    company: 'Acme Corp',
    status: 'New',
    source: 'Website',
    createdAt: '2024-01-20',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '987-654-3210',
    company: 'Beta Inc',
    status: 'Contacted',
    source: 'Referral',
    createdAt: '2024-01-15',
  },
  {
    id: '3',
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    phone: '555-123-4567',
    company: 'Gamma Ltd',
    status: 'Qualified',
    source: 'LinkedIn',
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    name: 'Bob Williams',
    email: 'bob.williams@example.com',
    phone: '111-222-3333',
    company: 'Delta Co',
    status: 'Proposal Sent',
    source: 'Email Campaign',
    createdAt: '2024-01-05',
  },
  {
    id: '5',
    name: 'Emily Brown',
    email: 'emily.brown@example.com',
    phone: '444-555-6666',
    company: 'Epsilon Group',
    status: 'Negotiation',
    source: 'Trade Show',
    createdAt: '2023-12-30',
  },
];

export const WorldClassLeadManagement = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [leads, setLeads] = useState(leadsData);

  const handleCreateLead = useCallback((newLead) => {
    setLeads(prevLeads => [...prevLeads, { id: String(Date.now()), ...newLead }]);
    setShowCreateDialog(false);
  }, []);

  const EnhancedLeadManagement = () => {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>{lead.name}</TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell>{lead.company}</TableCell>
                <TableCell>{lead.status}</TableCell>
                <TableCell>{lead.source}</TableCell>
                <TableCell>{lead.createdAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="space-y-6 p-4 md:p-6">
        {/* World-Class Header with Premium Design - Made More Compact */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 rounded-3xl shadow-2xl">
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full" style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 75% 75%, #8b5cf6 0%, transparent 50%)'
            }} />
          </div>
          
          <div className="relative px-6 py-6 md:px-8 md:py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-75 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                    <Crown className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-4">
                    Lead Management
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black border-0 text-xs px-2 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Powered
                    </Badge>
                  </h1>
                  <p className="text-blue-100 text-sm md:text-base mt-2 font-medium">
                    World-class lead management with intelligent automation and real-time insights
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowImportDialog(true)}
                  className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 text-xs px-3 py-2"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Import
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSettingsDialog(true)}
                  className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 text-xs px-3 py-2"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Settings
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg text-xs px-3 py-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add New Lead
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with reduced spacing */}
        <div className="space-y-4">
          <EnhancedLeadManagement />
        </div>
      </div>

      {/* Create Lead Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Create a new lead to track potential customers.
            </DialogDescription>
          </DialogHeader>
          <CreateLeadForm onCreate={handleCreateLead} />
        </DialogContent>
      </Dialog>

      {/* Import Leads Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Import Leads</DialogTitle>
            <DialogDescription>
              Import leads from a CSV file.
            </DialogDescription>
          </DialogHeader>
          <ImportLeadsForm />
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your lead management settings.
            </DialogDescription>
          </DialogHeader>
          <SettingsForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CreateLeadForm = ({ onCreate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState('New');
  const [source, setSource] = useState('Website');
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleSubmit = (e) => {
    e.preventDefault();
    const newLead = {
      name,
      email,
      phone,
      company,
      status,
      source,
      createdAt: date ? format(date, "yyyy-MM-dd") : '',
    };
    onCreate(newLead);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="company">Company</Label>
          <Input type="text" id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Qualified">Qualified</SelectItem>
              <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
              <SelectItem value="Negotiation">Negotiation</SelectItem>
              <SelectItem value="Closed Won">Closed Won</SelectItem>
              <SelectItem value="Closed Lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="source">Source</Label>
          <Select onValueChange={setSource}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Website">Website</SelectItem>
              <SelectItem value="Referral">Referral</SelectItem>
              <SelectItem value="LinkedIn">LinkedIn</SelectItem>
              <SelectItem value="Email Campaign">Email Campaign</SelectItem>
              <SelectItem value="Trade Show">Trade Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Created At</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) =>
                date > new Date() || date < new Date("2000-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <DialogFooter>
        <Button type="submit">Create Lead</Button>
      </DialogFooter>
    </form>
  );
};

const ImportLeadsForm = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle file upload logic here
    console.log('Importing file:', file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="csv">CSV File</Label>
        <Input type="file" id="csv" accept=".csv" onChange={handleFileChange} />
      </div>
      <DialogFooter>
        <Button type="submit">Import</Button>
      </DialogFooter>
    </form>
  );
};

const SettingsForm = () => {
  const [notificationPreferences, setNotificationPreferences] = useState('');
  const [dataSyncOptions, setDataSyncOptions] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle settings submission logic here
    console.log('Saving settings:', { notificationPreferences, dataSyncOptions });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="notifications">Notification Preferences</Label>
        <Textarea
          id="notifications"
          value={notificationPreferences}
          onChange={(e) => setNotificationPreferences(e.target.value)}
          placeholder="Enter your notification preferences"
        />
      </div>
      <div>
        <Label htmlFor="dataSync">Data Sync Options</Label>
        <Textarea
          id="dataSync"
          value={dataSyncOptions}
          onChange={(e) => setDataSyncOptions(e.target.value)}
          placeholder="Enter your data sync options"
        />
      </div>
      <DialogFooter>
        <Button type="submit">Save Settings</Button>
      </DialogFooter>
    </form>
  );
};
