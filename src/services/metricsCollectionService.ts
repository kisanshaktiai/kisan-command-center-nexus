import { supabase } from '@/integrations/supabase/client';

export class MetricsCollectionService {
  /**
   * Trigger manual collection of system metrics
   */
  static async collectSystemMetrics(): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('collect-system-metrics');
      
      if (error) {
        console.error('Error collecting system metrics:', error);
        throw error;
      }
      
      console.log('System metrics collection triggered successfully');
    } catch (error) {
      console.error('Failed to trigger system metrics collection:', error);
      throw error;
    }
  }

  /**
   * Trigger manual collection of resource metrics
   */
  static async collectResourceMetrics(): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('collect-resource-metrics');
      
      if (error) {
        console.error('Error collecting resource metrics:', error);
        throw error;
      }
      
      console.log('Resource metrics collection triggered successfully');
    } catch (error) {
      console.error('Failed to trigger resource metrics collection:', error);
      throw error;
    }
  }

  /**
   * Trigger manual collection of financial metrics
   */
  static async collectFinancialMetrics(): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('collect-financial-metrics');
      
      if (error) {
        console.error('Error collecting financial metrics:', error);
        throw error;
      }
      
      console.log('Financial metrics collection triggered successfully');
    } catch (error) {
      console.error('Failed to trigger financial metrics collection:', error);
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