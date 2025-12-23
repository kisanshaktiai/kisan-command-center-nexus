import { supabase } from '@/integrations/supabase/client';

export class MetricsCollectionService {
  /**
   * Trigger manual collection of system metrics
   */
  static async collectSystemMetrics(): Promise<void> {
    try {
      console.log('[MetricsCollection] Invoking platform-monitoring for system metrics...');
      
      const { data, error } = await supabase.functions.invoke('platform-monitoring', {
        body: { action: 'collect-metrics', metric_type: 'system' }
      });
      
      if (error) {
        console.error('[MetricsCollection] Error collecting system metrics:', error);
        throw new Error(`Failed to collect system metrics: ${error.message || 'Unknown error'}`);
      }
      
      console.log('[MetricsCollection] System metrics collected successfully:', data);
    } catch (error) {
      console.error('[MetricsCollection] Exception during system metrics collection:', error);
      throw error;
    }
  }

  /**
   * Trigger manual collection of resource metrics
   */
  static async collectResourceMetrics(): Promise<void> {
    try {
      console.log('[MetricsCollection] Invoking platform-monitoring for resource metrics...');
      
      const { data, error } = await supabase.functions.invoke('platform-monitoring', {
        body: { action: 'collect-metrics', metric_type: 'resource' }
      });
      
      if (error) {
        console.error('[MetricsCollection] Error collecting resource metrics:', error);
        throw new Error(`Failed to collect resource metrics: ${error.message || 'Unknown error'}`);
      }
      
      console.log('[MetricsCollection] Resource metrics collected successfully:', data);
    } catch (error) {
      console.error('[MetricsCollection] Exception during resource metrics collection:', error);
      throw error;
    }
  }

  /**
   * Trigger manual collection of financial metrics
   */
  static async collectFinancialMetrics(): Promise<void> {
    try {
      console.log('[MetricsCollection] Invoking platform-monitoring for financial metrics...');
      
      const { data, error } = await supabase.functions.invoke('platform-monitoring', {
        body: { action: 'collect-metrics', metric_type: 'financial' }
      });
      
      if (error) {
        console.error('[MetricsCollection] Error collecting financial metrics:', error);
        throw new Error(`Failed to collect financial metrics: ${error.message || 'Unknown error'}`);
      }
      
      console.log('[MetricsCollection] Financial metrics collected successfully:', data);
    } catch (error) {
      console.error('[MetricsCollection] Exception during financial metrics collection:', error);
      throw error;
    }
  }

  /**
   * Trigger collection of all metrics
   */
  static async collectAllMetrics(): Promise<void> {
    try {
      await Promise.all([
        this.collectSystemMetrics(),
        this.collectResourceMetrics(),
        this.collectFinancialMetrics()
      ]);
      
      console.log('All metrics collection completed successfully');
    } catch (error) {
      console.error('Error during metrics collection:', error);
      throw error;
    }
  }

  /**
   * Schedule periodic metrics collection (client-side fallback)
   */
  static startPeriodicCollection(intervalMinutes: number = 10): () => void {
    console.log(`Starting periodic metrics collection every ${intervalMinutes} minutes`);
    
    // Initial collection
    this.collectAllMetrics().catch(console.error);
    
    // Set up interval
    const intervalId = setInterval(() => {
      this.collectAllMetrics().catch(console.error);
    }, intervalMinutes * 60 * 1000);
    
    // Return cleanup function
    return () => {
      console.log('Stopping periodic metrics collection');
      clearInterval(intervalId);
    };
  }
}