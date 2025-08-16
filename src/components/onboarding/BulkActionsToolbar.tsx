
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, X, RotateCcw } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedSteps: string[];
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isLoading: boolean;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedSteps,
  onBulkApprove,
  onBulkReject,
  onUndo,
  canUndo,
  isLoading,
}) => {
  if (selectedSteps.length === 0 && !canUndo) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
      {selectedSteps.length > 0 && (
        <>
          <Badge variant="secondary" className="mr-2">
            {selectedSteps.length} selected
          </Badge>
          
          <Button
            size="sm"
            onClick={onBulkApprove}
            disabled={isLoading}
            className="gap-1"
          >
            <CheckSquare className="h-4 w-4" />
            Bulk Approve
          </Button>
          
          <Button
            size="sm"
            variant="destructive"
            onClick={onBulkReject}
            disabled={isLoading}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Bulk Reject
          </Button>
        </>
      )}
      
      {canUndo && (
        <Button
          size="sm"
          variant="outline"
          onClick={onUndo}
          disabled={isLoading}
          className="gap-1 ml-auto"
        >
          <RotateCcw className="h-4 w-4" />
          Undo Last Action
        </Button>
      )}
    </div>
  );
};
