import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Check } from 'lucide-react';

interface BrandingSuggestion {
  appName: string;
  tagLine: string;
}

interface BrandingSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: BrandingSuggestion[];
  onSelectSuggestion: (suggestion: BrandingSuggestion) => void;
}

export function BrandingSuggestionsDialog({
  open,
  onOpenChange,
  suggestions,
  onSelectSuggestion,
}: BrandingSuggestionsDialogProps) {
  const handleSelect = (suggestion: BrandingSuggestion) => {
    onSelectSuggestion(suggestion);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Generated Branding Suggestions
          </DialogTitle>
          <DialogDescription>
            Click on any suggestion to apply it to your app name and tagline
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {suggestions.map((suggestion, index) => (
            <Card
              key={index}
              className="p-4 cursor-pointer hover:border-primary hover:bg-accent/50 transition-all"
              onClick={() => handleSelect(suggestion)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      App Name
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {suggestion.appName}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({suggestion.appName.length}/15 chars)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Tag Line
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.tagLine}
                      <span className="text-xs ml-2">
                        ({suggestion.tagLine.length}/26 chars)
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(suggestion);
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
