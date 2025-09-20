import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, HardDrive, MemoryStick, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealTimeSystemMetrics } from '@/hooks/useRealTimeSystemMetrics';

interface ResourceIndicatorProps {
  label: string;
  value: number;
  icon: React.FC<{ className?: string }>;
  color: 'green' | 'yellow' | 'red';
}

const ResourceIndicator: React.FC<ResourceIndicatorProps> = ({ label, value, icon: Icon, color }) => {
  const colorClasses = {
    green: 'text-emerald-500 bg-emerald-500',
    yellow: 'text-amber-500 bg-amber-500',
    red: 'text-red-500 bg-red-500'
  };

  const getColor = (val: number) => {
    if (val < 60) return 'green';
    if (val < 80) return 'yellow';
    return 'red';
  };

  const actualColor = getColor(value);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", colorClasses[actualColor].split(' ')[0])} />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", colorClasses[actualColor].split(' ')[1])}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={cn("text-sm font-semibold min-w-[3rem] text-right", colorClasses[actualColor].split(' ')[0])}>
          {value}%
        </span>
      </div>
    </div>
  );
};

export const SystemResourcesPanel: React.FC = () => {
  const { 
    currentCpuUsage, 
    currentMemoryUsage, 
    currentDiskUsage,
    currentStorageUsed,
    currentStorageTotal
  } = useRealTimeSystemMetrics();

  const storagePercentage = Math.round((currentStorageUsed / currentStorageTotal) * 100);

  // Calculate overall health score
  const avgUsage = (currentCpuUsage + currentMemoryUsage + currentDiskUsage + storagePercentage) / 4;
  const healthStatus = avgUsage < 60 ? 'Excellent' : avgUsage < 80 ? 'Good' : 'Critical';
  const healthColor = avgUsage < 60 ? 'text-emerald-500' : avgUsage < 80 ? 'text-amber-500' : 'text-red-500';

  return (
    <Card className={cn(
      "border-0 shadow-xl",
      "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl",
      "hover:shadow-2xl transition-all duration-300"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Server className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            System Resources
          </CardTitle>
          <span className={cn("text-sm font-semibold", healthColor)}>
            {healthStatus}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResourceIndicator
          label="CPU"
          value={currentCpuUsage}
          icon={Cpu}
          color="green"
        />
        <ResourceIndicator
          label="Memory"
          value={currentMemoryUsage}
          icon={MemoryStick}
          color="yellow"
        />
        <ResourceIndicator
          label="Disk"
          value={currentDiskUsage}
          icon={HardDrive}
          color="green"
        />
        <ResourceIndicator
          label="Storage"
          value={storagePercentage}
          icon={Server}
          color="green"
        />
        
        {/* Visual Health Indicator */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-slate-200 dark:text-slate-700"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(100 - avgUsage) * 2.26} 226`}
                  className={cn(
                    "transition-all duration-1000",
                    avgUsage < 60 ? "text-emerald-500" : 
                    avgUsage < 80 ? "text-amber-500" : "text-red-500"
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(100 - avgUsage)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};