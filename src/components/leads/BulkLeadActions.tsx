
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Calculator, X } from 'lucide-react';

interface BulkLeadActionsProps {
  selectedCount: number;
  onAutoAssign: () => void;
  onCalculateScore: () => void;
  onClearSelection: () => void;
}

export const BulkLeadActions: React.FC<BulkLeadActionsProps> = ({
  selectedCount,
  onAutoAssign,
  onCalculateScore,
  onClearSelection,
}) => {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected
            </Badge>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onAutoAssign}
                className="bg-white"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Auto Assign
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onCalculateScore}
                className="bg-white"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Score
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
