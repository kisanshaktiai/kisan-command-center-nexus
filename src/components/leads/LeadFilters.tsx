
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter } from 'lucide-react';

export const LeadFilters: React.FC = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>All Leads</DropdownMenuItem>
        <DropdownMenuItem>New</DropdownMenuItem>
        <DropdownMenuItem>Assigned</DropdownMenuItem>
        <DropdownMenuItem>Qualified</DropdownMenuItem>
        <DropdownMenuItem>Converted</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
