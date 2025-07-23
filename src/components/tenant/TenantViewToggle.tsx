
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid3X3, LayoutGrid, List, BarChart3, Settings2 } from 'lucide-react';
import { TenantViewMode, ViewDensity, TenantViewPreferences } from '@/types/tenantView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TenantViewToggleProps {
  preferences: TenantViewPreferences;
  onPreferencesChange: (preferences: TenantViewPreferences) => void;
  totalCount: number;
}

export const TenantViewToggle: React.FC<TenantViewToggleProps> = ({
  preferences,
  onPreferencesChange,
  totalCount,
}) => {
  const viewModes: { mode: TenantViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'small-cards', icon: <Grid3X3 className="h-4 w-4" />, label: 'Small Cards' },
    { mode: 'large-cards', icon: <LayoutGrid className="h-4 w-4" />, label: 'Large Cards' },
    { mode: 'list', icon: <List className="h-4 w-4" />, label: 'List View' },
    { mode: 'analytics', icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics' },
  ];

  const densityOptions: { density: ViewDensity; label: string }[] = [
    { density: 'compact', label: 'Compact' },
    { density: 'comfortable', label: 'Comfortable' },
    { density: 'spacious', label: 'Spacious' },
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {totalCount} tenant{totalCount !== 1 ? 's' : ''}
        </span>
        <Badge variant="outline">
          {preferences.mode.replace('-', ' ')}
        </Badge>
      </div>

      <div className="flex items-center border rounded-lg p-1">
        {viewModes.map(({ mode, icon, label }) => (
          <Button
            key={mode}
            variant={preferences.mode === mode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onPreferencesChange({ ...preferences, mode })}
            className="h-8 w-8 p-0"
            title={label}
          >
            {icon}
          </Button>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings2 className="h-4 w-4 mr-2" />
            View Options
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Density</DropdownMenuLabel>
          {densityOptions.map(({ density, label }) => (
            <DropdownMenuItem
              key={density}
              onClick={() => onPreferencesChange({ ...preferences, density })}
              className={preferences.density === density ? 'bg-accent' : ''}
            >
              {label}
              {preferences.density === density && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => onPreferencesChange({ ...preferences, sortBy: 'name' })}
            className={preferences.sortBy === 'name' ? 'bg-accent' : ''}
          >
            Name
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onPreferencesChange({ ...preferences, sortBy: 'created_at' })}
            className={preferences.sortBy === 'created_at' ? 'bg-accent' : ''}
          >
            Created Date
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onPreferencesChange({ ...preferences, sortBy: 'status' })}
            className={preferences.sortBy === 'status' ? 'bg-accent' : ''}
          >
            Status
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
