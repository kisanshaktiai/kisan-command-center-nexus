import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TestResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration?: number;
}

export class MonitoringTestService {
  /**
   * Test real-time subscriptions functionality
   */
  static async testRealtimeSubscriptions(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test if we can subscribe to a channel
      const testChannel = supabase.channel('test-monitoring-connectivity');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          supabase.removeChannel(testChannel);
          resolve({
            component: 'Real-time Subscriptions',
            status: 'warning',
            message: 'Subscription test timed out after 5 seconds',
            duration: Date.now() - startTime
          });
        }, 5000);

        testChannel
          .on('presence', { event: 'sync' }, () => {
            clearTimeout(timeout);
            supabase.removeChannel(testChannel);
            resolve({
              component: 'Real-time Subscriptions',
              status: 'pass',
              message: 'Real-time connectivity established successfully',
              duration: Date.now() - startTime
            });
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Channel is connected, test passed
              clearTimeout(timeout);
              supabase.removeChannel(testChannel);
              resolve({
                component: 'Real-time Subscriptions',
                status: 'pass',
                message: 'Real-time subscriptions working correctly',
                duration: Date.now() - startTime
              });
            }
          });
      });
    } catch (error) {
      return {
        component: 'Real-time Subscriptions',
        status: 'fail',
        message: `Real-time subscription failed: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test metrics collection endpoints
   */
  static async testMetricsCollection(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    // Test system metrics collection
    try {
      const startTime = Date.now();
      const { error } = await supabase.functions.invoke('collect-system-metrics');
      
      if (error) {
        results.push({
          component: 'System Metrics Collection',
          status: 'fail',
          message: `System metrics collection failed: ${error.message}`,
          duration: Date.now() - startTime
        });
      } else {
        results.push({
          component: 'System Metrics Collection',
          status: 'pass',
          message: 'System metrics collected successfully',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      results.push({
        component: 'System Metrics Collection',
        status: 'fail',
        message: `System metrics collection error: ${error.message}`
      });
    }

    // Test resource metrics collection
    try {
      const startTime = Date.now();
      const { error } = await supabase.functions.invoke('collect-resource-metrics');
      
      if (error) {
        results.push({
          component: 'Resource Metrics Collection',
          status: 'fail',
          message: `Resource metrics collection failed: ${error.message}`,
          duration: Date.now() - startTime
        });
      } else {
        results.push({
          component: 'Resource Metrics Collection',
          status: 'pass',
          message: 'Resource metrics collected successfully',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      results.push({
        component: 'Resource Metrics Collection',
        status: 'fail',
        message: `Resource metrics collection error: ${error.message}`
      });
    }

    // Test financial metrics collection
    try {
      const startTime = Date.now();
      const { error } = await supabase.functions.invoke('collect-financial-metrics');
      
      if (error) {
        results.push({
          component: 'Financial Metrics Collection',
          status: 'fail',
          message: `Financial metrics collection failed: ${error.message}`,
          duration: Date.now() - startTime
        });
      } else {
        results.push({
          component: 'Financial Metrics Collection',
          status: 'pass',
          message: 'Financial metrics collected successfully',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      results.push({
        component: 'Financial Metrics Collection',
        status: 'fail',
        message: `Financial metrics collection error: ${error.message}`
      });
    }

    return results;
  }

  /**
   * Test database connectivity and table access
   */
  static async testDatabaseConnectivity(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test system health metrics table
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('system_health_metrics')
        .select('id')
        .limit(1);

      if (error) {
        results.push({
          component: 'Database Access - system_health_metrics',
          status: 'fail',
          message: `Cannot access system_health_metrics table: ${error.message}`,
          duration: Date.now() - startTime
        });
      } else {
        results.push({
          component: 'Database Access - system_health_metrics',
          status: 'pass',
          message: 'System health metrics table accessible',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      results.push({
        component: 'Database Access - system_health_metrics',
        status: 'fail',
        message: `Database connectivity error: ${error.message}`
      });
    }

    // Test resource utilization table
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('resource_utilization')
        .select('id')
        .limit(1);

      if (error) {
        results.push({
          component: 'Database Access - resource_utilization',
          status: 'fail',
          message: `Cannot access resource_utilization table: ${error.message}`,
          duration: Date.now() - startTime
        });
      } else {
        results.push({
          component: 'Database Access - resource_utilization',
          status: 'pass',
          message: 'Resource utilization table accessible',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      results.push({
        component: 'Database Access - resource_utilization',
        status: 'fail',
        message: `Database connectivity error: ${error.message}`
      });
    }

    // Test financial analytics table
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('financial_analytics')
        .select('id')
        .limit(1);

      if (error) {
        results.push({
          component: 'Database Access - financial_analytics',
          status: 'fail',
          message: `Cannot access financial_analytics table: ${error.message}`,
          duration: Date.now() - startTime
        });
      } else {
        results.push({
          component: 'Database Access - financial_analytics',
          status: 'pass',
          message: 'Financial analytics table accessible',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      results.push({
        component: 'Database Access - financial_analytics',
        status: 'fail',
        message: `Database connectivity error: ${error.message}`
      });
    }

    // Test feature flags table
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('feature_flags')
        .select('id')
        .limit(1);

      if (error) {
        results.push({
          component: 'Database Access - feature_flags',
          status: 'fail',
          message: `Cannot access feature_flags table: ${error.message}`,
          duration: Date.now() - startTime
        });
      } else {
        results.push({
          component: 'Database Access - feature_flags',
          status: 'pass',
          message: 'Feature flags table accessible',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      results.push({
        component: 'Database Access - feature_flags',
        status: 'fail',
        message: `Database connectivity error: ${error.message}`
      });
    }

    // Test webhooks table
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('webhooks')
        .select('id')
        .limit(1);

      if (error) {
        results.push({
          component: 'Database Access - webhooks',
          status: 'fail',
          message: `Cannot access webhooks table: ${error.message}`,
          duration: Date.now() - startTime
        });
      } else {
        results.push({
          component: 'Database Access - webhooks',
          status: 'pass',
          message: 'Webhooks table accessible',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      results.push({
        component: 'Database Access - webhooks',
        status: 'fail',
        message: `Database connectivity error: ${error.message}`
      });
    }

    return results;
  }

  /**
   * Run comprehensive monitoring tests
   */
  static async runComprehensiveTests(): Promise<TestResult[]> {
    const allResults: TestResult[] = [];
    
    try {
      toast.info('Running monitoring system tests...');
      
      // Test real-time subscriptions
      const realtimeResult = await this.testRealtimeSubscriptions();
      allResults.push(realtimeResult);
      
      // Test metrics collection
      const metricsResults = await this.testMetricsCollection();
      allResults.push(...metricsResults);
      
      // Test database connectivity
      const dbResults = await this.testDatabaseConnectivity();
      allResults.push(...dbResults);
      
      // Show summary
      const passCount = allResults.filter(r => r.status === 'pass').length;
      const failCount = allResults.filter(r => r.status === 'fail').length;
      const warnCount = allResults.filter(r => r.status === 'warning').length;
      
      if (failCount === 0 && warnCount === 0) {
        toast.success(`All ${passCount} tests passed! Monitoring system is healthy.`);
      } else if (failCount === 0) {
        toast.warning(`${passCount} tests passed, ${warnCount} warnings. System mostly functional.`);
      } else {
        toast.error(`${failCount} tests failed, ${passCount} passed. Issues detected.`);
      }
      
    } catch (error) {
      console.error('Error running comprehensive tests:', error);
      allResults.push({
        component: 'Test Runner',
        status: 'fail',
        message: `Test execution failed: ${error.message}`
      });
    }
    
    return allResults;
  }
}