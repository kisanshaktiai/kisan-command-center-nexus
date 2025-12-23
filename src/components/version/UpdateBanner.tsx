/**
 * UpdateBanner - Shows soft update notification when new version available
 * 
 * Displays a dismissible banner when an optional update is available.
 * For forced updates, shows a blocking modal instead.
 */

import { useState } from 'react';
import { useAppVersionCheck } from '@/hooks/useAppVersionCheck';
import { X, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UpdateBannerProps {
  className?: string;
}

export function UpdateBanner({ className = '' }: UpdateBannerProps) {
  const { status, latestVersion, updatePolicy, releaseNotes } = useAppVersionCheck();
  const [dismissed, setDismissed] = useState(false);

  // Show blocking modal for required updates
  if (status === 'update-required') {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Update Required
            </DialogTitle>
            <DialogDescription>
              Your app version is no longer supported. Please refresh to get the latest version.
            </DialogDescription>
          </DialogHeader>
          
          {releaseNotes && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">What's New in v{latestVersion}:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {releaseNotes}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => window.location.reload()} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Update Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Don't show banner if dismissed, up-to-date, or still checking
  if (
    dismissed || 
    status !== 'update-available' || 
    updatePolicy === 'FORCED' // Forced should use the modal above
  ) {
    return null;
  }

  return (
    <div 
      className={`
        fixed bottom-4 right-4 z-50 max-w-sm
        bg-primary text-primary-foreground 
        rounded-lg shadow-lg p-4
        animate-in slide-in-from-bottom-4
        ${className}
      `}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary-foreground/10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-6">
        <p className="font-medium">Update Available</p>
        <p className="text-sm opacity-90 mt-1">
          Version {latestVersion} is now available.
        </p>
        
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => window.location.reload()}
        >
          <Download className="h-4 w-4 mr-2" />
          Update
        </Button>
      </div>
    </div>
  );
}
