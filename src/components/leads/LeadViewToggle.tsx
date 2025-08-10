
import React from 'react';
import { Button } from '@/components/ui/button';
import { List, Grid } from 'lucide-react';

export const LeadViewToggle: React.FC = () => {
  return (
    <div className="flex items-center space-x-1">
      <Button variant="outline" size="sm">
        <List className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm">
        <Grid className="h-4 w-4" />
      </Button>
    </div>
  );
};
