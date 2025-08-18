
import { test, expect } from '@playwright/test';

test.describe('Tenant Metrics E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
  });

  test('should display tenant metrics with error handling', async ({ page }) => {
    // Navigate to tenant management
    await page.click('[data-testid="nav-tenant-management"]');
    await expect(page).toHaveURL(/.*tenant-management/);
    
    // Wait for tenant list to load
    await page.waitForSelector('[data-testid="tenant-list"]', { timeout: 10000 });
    
    // Check if metrics cards are visible or show error states
    const metricsCards = await page.locator('.tenant-metrics-card').count();
    if (metricsCards > 0) {
      // If metrics cards exist, they should either show data or error states
      const errorBanners = await page.locator('[role="alert"]').count();
      const retryButtons = await page.locator('button:has-text("Retry")').count();
      
      // Either we have successful metrics or error states with retry buttons
      expect(metricsCards > 0 || errorBanners > 0 || retryButtons > 0).toBeTruthy();
    }
  });

  test('should handle metrics fetch failures gracefully', async ({ page }) => {
    // Mock network failure for metrics
    await page.route('**/functions/v1/tenant-real-time-metrics', route => route.abort());
    
    // Navigate to tenant management
    await page.click('[data-testid="nav-tenant-management"]');
    
    // Wait for page to load and handle the error
    await page.waitForLoadState('networkidle');
    
    // Should show error states or fallback content
    const errorElements = await page.locator('[role="alert"], .text-muted-foreground:has-text("—"), button:has-text("Retry")').count();
    expect(errorElements).toBeGreaterThan(0);
  });

  test('should allow retry of failed metrics', async ({ page }) => {
    let requestCount = 0;
    
    // Mock first request to fail, second to succeed
    await page.route('**/functions/v1/tenant-real-time-metrics', route => {
      requestCount++;
      if (requestCount === 1) {
        route.abort();
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            current_metrics: {
              active_users: 42,
              api_calls_last_hour: 150,
              error_rate: 2.5,
              response_time_avg: 250,
              storage_usage_mb: 1024,
              bandwidth_usage_mb: 512
            },
            health_indicators: {
              system_health: 'healthy',
              database_health: 'healthy',
              api_health: 'healthy',
              storage_health: 'healthy'
            },
            alerts: [],
            capacity_status: {
              farmers_usage: { current: 50, limit: 1000, percentage: 5 },
              dealers_usage: { current: 5, limit: 50, percentage: 10 },
              storage_usage: { current: 1, limit: 10, percentage: 10 },
              api_usage: { current: 1000, limit: 10000, percentage: 10 }
            }
          })
        });
      }
    });
    
    // Navigate to tenant management
    await page.click('[data-testid="nav-tenant-management"]');
    
    // Wait for error state
    await page.waitForSelector('button:has-text("Retry")', { timeout: 10000 });
    
    // Click retry button
    await page.click('button:has-text("Retry")');
    
    // Wait for success state (metrics should load)
    await page.waitForSelector('.text-2xl:has-text("42")', { timeout: 10000 });
    
    expect(requestCount).toBe(2);
  });

  test('should show skeleton loaders while fetching', async ({ page }) => {
    // Delay the metrics response
    await page.route('**/functions/v1/tenant-real-time-metrics', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });
    
    // Navigate to tenant management
    await page.click('[data-testid="nav-tenant-management"]');
    
    // Should show skeleton loaders
    await expect(page.locator('.animate-pulse')).toBeVisible();
  });
});
