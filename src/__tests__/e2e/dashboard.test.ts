
import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
  });

  test('should display overview metrics', async ({ page }) => {
    // Wait for metrics to load
    await page.waitForSelector('[data-testid="metric-card"]');
    
    // Check if all metric cards are visible
    const metricCards = await page.locator('[data-testid="metric-card"]').count();
    expect(metricCards).toBeGreaterThan(0);
    
    // Verify specific metrics
    await expect(page.getByText('Total Tenants')).toBeVisible();
    await expect(page.getByText('Active Sessions')).toBeVisible();
    await expect(page.getByText('System Health')).toBeVisible();
  });

  test('should handle real-time updates', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="metric-card"]');
    
    // Get initial values
    const initialTenantCount = await page.getByTestId('total-tenants-value').textContent();
    
    // Simulate real-time update (would normally come from websocket)
    await page.evaluate(() => {
      // Trigger a state update that would happen from real-time subscription
      window.dispatchEvent(new CustomEvent('metrics-update', {
        detail: { totalTenants: parseInt(initialTenantCount || '0') + 1 }
      }));
    });
    
    // Verify the UI updates
    await expect(page.getByTestId('total-tenants-value')).not.toHaveText(initialTenantCount || '');
  });

  test('should navigate between different views', async ({ page }) => {
    // Test navigation to tenant management
    await page.click('[data-testid="nav-tenant-management"]');
    await expect(page).toHaveURL(/.*tenant-management/);
    
    // Verify tenant list loads
    await page.waitForSelector('[data-testid="tenant-list"]');
    await expect(page.getByText('Tenant Management')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/metrics', route => route.abort());
    
    // Reload page to trigger error
    await page.reload();
    
    // Verify error handling
    await expect(page.getByText(/error|failed/i)).toBeVisible();
  });
});
