import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { CompactLeadCard } from './CompactLeadCard';
import { LeadCard } from './EnhancedLeadCard';
import type { Lead } from '@/types/leads';

interface VirtualizedKanbanColumnProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  leads: Lead[];
  onReassign: (leadId: string) => void;
  onConvert: (leadId: string) => void;
  selectedLeads: string[];
  onLeadSelection: (leadId: string) => void;
  expandedLeads: Set<string>;
  onToggleExpanded: (leadId: string) => void;
  onRefresh?: () => void;
  compactMode?: boolean;
  searchable?: boolean;
  status?: Lead['status'];
}

export const VirtualizedKanbanColumn: React.FC<VirtualizedKanbanColumnProps> = ({
  title,
  icon: IconComponent,
  color,
  bgColor,
  borderColor,
  textColor,
  leads,
  onReassign,
  onConvert,
  selectedLeads,
  onLeadSelection,
  expandedLeads,
  onToggleExpanded,
  onRefresh,
  compactMode = false,
  searchable = false,
  status
}) => {
  const [columnSearch, setColumnSearch] = React.useState('');
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isHidden, setIsHidden] = React.useState(false);

  const filteredLeads = React.useMemo(() => {
    if (!columnSearch) return leads;
    return leads.filter(lead =>
      lead.contact_name.toLowerCase().includes(columnSearch.toLowerCase()) ||
      lead.email.toLowerCase().includes(columnSearch.toLowerCase()) ||
      (lead.organization_name?.toLowerCase().includes(columnSearch.toLowerCase()))
    );
  }, [leads, columnSearch]);

  const renderItem = React.useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const lead = filteredLeads[index];
    
    return (
      <div style={style} className="px-1">
        {compactMode ? (
          <CompactLeadCard
            lead={lead}
            onReassign={onReassign}
            onConvert={onConvert}
            isSelected={selectedLeads.includes(lead.id)}
            onSelect={() => onLeadSelection(lead.id)}
            onRefresh={onRefresh}
          />
        ) : (
          <div className="mb-3">
            <LeadCard
              lead={lead}
              onReassign={onReassign}
              onConvert={onConvert}
              isSelected={selectedLeads.includes(lead.id)}
              onSelect={() => onLeadSelection(lead.id)}
              expanded={expandedLeads.has(lead.id)}
              onToggleExpanded={() => onToggleExpanded(lead.id)}
              onRefresh={onRefresh}
              showConvertButton={status === 'converted'}
            />
          </div>
        )}
      </div>
    );
  }, [filteredLeads, compactMode, onReassign, onConvert, selectedLeads, onLeadSelection, expandedLeads, onToggleExpanded, onRefresh, status]);

  if (isHidden) {
    return (
      <Card className={`${borderColor} border-2 w-80 flex-shrink-0`}>
        <CardHeader className={`${bgColor} pb-4`}>
          <CardTitle className={`flex items-center justify-between ${textColor}`}>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${color} text-white`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-sm">{title}</div>
                <div className="text-xs opacity-70">{leads.length} hidden</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHidden(false)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`${borderColor} border-2 w-80 flex-shrink-0 flex flex-col ${compactMode ? 'max-h-[600px]' : 'min-h-[400px]'}`}>
      <CardHeader className={`${bgColor} pb-4 flex-shrink-0`}>
        <CardTitle className={`flex items-center justify-between ${textColor}`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${color} text-white`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-sm">{title}</div>
              <div className="text-xs opacity-70">
                {filteredLeads.length} of {leads.length} lead{leads.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="ml-2">
              {filteredLeads.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHidden(true)}
              className="h-8 w-8 p-0"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>

        {searchable && !isCollapsed && (
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search in column..."
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                className="pl-10 h-8 text-sm"
              />
            </div>
          </div>
        )}
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="flex-1 p-4 overflow-hidden">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">
                {columnSearch ? 'No matching leads' : 'No leads in this status'}
              </p>
            </div>
          ) : compactMode ? (
            <List
              height={400}
              itemCount={filteredLeads.length}
              itemSize={compactMode ? 120 : 300}
              width="100%"
            >
              {renderItem}
            </List>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {filteredLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onReassign={onReassign}
                    onConvert={onConvert}
                    isSelected={selectedLeads.includes(lead.id)}
                    onSelect={() => onLeadSelection(lead.id)}
                    expanded={expandedLeads.has(lead.id)}
                    onToggleExpanded={() => onToggleExpanded(lead.id)}
                    onRefresh={onRefresh}
                    showConvertButton={status === 'converted'}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
};
