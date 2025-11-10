import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const DataGeneratorButton: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleGenerator = async () => {
    setIsLoading(true);
    try {
      if (isGenerating) {
        // Stop generation
        localStorage.setItem('monitoring-generator-status', 'stopped');
        setIsGenerating(false);
        toast.success('Data generation stopped');
      } else {
        // Start generation by invoking edge function
        const { error } = await supabase.functions.invoke('admin-utilities', {
          body: { operation: 'generate-monitoring-data' }
        });
        
        if (error) throw error;
        
        localStorage.setItem('monitoring-generator-status', 'running');
        setIsGenerating(true);
        toast.success('Data generation started');
      }
    } catch (error) {
      console.error('Error toggling data generator:', error);
      toast.error('Failed to toggle data generator');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    // Check initial status
    const status = localStorage.getItem('monitoring-generator-status');
    setIsGenerating(status === 'running');
  }, []);

  return (
    <Button
      variant={isGenerating ? 'destructive' : 'default'}
      size="sm"
      onClick={handleToggleGenerator}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isGenerating ? (
        <Square className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {isGenerating ? 'Stop Generator' : 'Start Generator'}
    </Button>
  );
};