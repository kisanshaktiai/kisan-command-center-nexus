import React from 'react';
import { Activity } from 'lucide-react';

interface RealtimeIndicatorProps {
  isConnected: boolean;
  lastUpdate?: Date;
  className?: string;
}

export const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({
  isConnected,
  lastUpdate,
  className = ''
}) => {
  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return '';
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Activity 
          className={`h-4 w-4 ${isConnected ? 'text-success' : 'text-muted-foreground'}`}
        />
        {isConnected && (
          <>
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-success rounded-full animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-success rounded-full animate-ping" />
          </>
        )}
      </div>
      
      <div className="flex items-center gap-1.5 text-sm">
        <span className={`font-medium ${isConnected ? 'text-success' : 'text-muted-foreground'}`}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
        {lastUpdate && (
          <span className="text-muted-foreground text-xs">
            • {getTimeSinceUpdate()}
          </span>
        )}
      </div>
    </div>
  );
};