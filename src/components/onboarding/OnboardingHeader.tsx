
import React, { useState } from 'react';
import { useOnboarding } from './OnboardingProvider';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

interface OnboardingHeaderProps {
  onClose?: () => void;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({ onClose }) => {
  const { 
    progress, 
    tenantInfo, 
    steps, 
    state: { currentStepIndex },
    remainingTime,
    removeWorkflow,
    isRemoving
  } = useOnboarding();

  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const handleRemoveWorkflow = async () => {
    try {
      await removeWorkflow();
      setShowRemoveDialog(false);
      // Call onClose to exit the onboarding flow
      onClose?.();
    } catch (error) {
      console.error('Failed to remove workflow:', error);
      // Error is already handled by the hook and shown to user
    }
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">
            {tenantInfo?.name || 'Loading...'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tenantInfo?.subscription_plan || 'Loading...'} Plan • Step {currentStepIndex + 1} of {steps.length}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right space-y-1">
            <div className="text-2xl font-bold text-primary">{progress}%</div>
            <div className="text-sm text-muted-foreground">
              ~{remainingTime} min remaining
            </div>
          </div>

          <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isRemoving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Workflow
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Onboarding Workflow</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove this onboarding workflow? This will delete all progress and cannot be undone.
                  You will need to start the onboarding process from the beginning if you want to continue later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemoveWorkflow}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isRemoving}
                >
                  {isRemoving ? 'Removing...' : 'Remove Workflow'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      <div className="space-y-3">
        <Progress value={progress} className="w-full h-3 bg-muted" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress: {progress}% complete</span>
          <span>Estimated time remaining: ~{remainingTime} minutes</span>
        </div>
      </div>
    </div>
  );
};
