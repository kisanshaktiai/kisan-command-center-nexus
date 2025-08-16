
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCheck, 
  X, 
  SelectAll, 
  Undo2, 
  Square, 
  CheckSquare 
} from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  canUndo: boolean;
  onUndo: () => void;
  isProcessing: boolean;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkApprove,
  onBulkReject,
  canUndo,
  onUndo,
  isProcessing
}) => {
  const allSelected = selectedCount === totalCount;
  const someSelected = selectedCount > 0;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={allSelected ? onDeselectAll : onSelectAll}
              disabled={isProcessing}
              className="p-1 h-8 w-8"
              aria-label={allSelected ? 'Deselect all steps' : 'Select all steps'}
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
            
            <span className="text-sm text-muted-foreground">
              {selectedCount > 0 ? (
                <>
                  <Badge variant="secondary" className="mr-2">
                    {selectedCount}
                  </Badge>
                  of {totalCount} steps selected
                </>
              ) : (
                `${totalCount} steps available`
              )}
            </span>
          </div>

          {someSelected && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onBulkApprove}
                  disabled={isProcessing}
                  className="h-8"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Approve Selected
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onBulkReject}
                  disabled={isProcessing}
                  className="h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Reject Selected
                </Button>
              </div>
            </>
          )}
        </div>

        {canUndo && (
          <Button
            size="sm"
            variant="outline"
            onClick={onUndo}
            disabled={isProcessing}
            className="h-8"
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Undo Last Action
          </Button>
        )}
      </div>

      {isProcessing && (
        <div className="mt-2 text-xs text-muted-foreground">
          Processing bulk action...
        </div>
      )}
    </div>
  );
};
