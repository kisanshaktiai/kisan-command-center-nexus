
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to different pages', async ({ page }) => {
    await page.goto('/');
    
    // Check if we can navigate to public pages
    const response = await page.request.get('/');
    expect(response.status()).toBeLessThan(500);
  });

  test('should handle protected routes', async ({ page }) => {
    await page.goto('/super-admin/lead-management');
    
    // Should redirect to authentication
    await expect(page).toHaveURL(/\/super-admin/);
    await expect(page.getByText(/authentication|login/i)).toBeVisible();
  });
});
