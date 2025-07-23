
import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewType = 'grid' | 'list' | 'table';

interface TenantViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
}

export const TenantViewSwitcher: React.FC<TenantViewSwitcherProps> = ({
  currentView,
  onViewChange,
  className
}) => {
  const views = [
    { id: 'grid' as ViewType, icon: LayoutGrid, label: 'Grid View' },
    { id: 'list' as ViewType, icon: List, label: 'List View' },
    { id: 'table' as ViewType, icon: Table, label: 'Table View' }
  ];

  return (
    <div className={cn("flex rounded-lg border bg-background p-1", className)}>
      {views.map(({ id, icon: Icon, label }) => (
        <Button
          key={id}
          variant={currentView === id ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange(id)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5",
            currentView === id && "bg-primary text-primary-foreground"
          )}
          title={label}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label.split(' ')[0]}</span>
        </Button>
      ))}
    </div>
  );
};
