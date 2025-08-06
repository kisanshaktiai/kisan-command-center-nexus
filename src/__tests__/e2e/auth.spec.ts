
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to auth page or show login form
    await expect(page).toHaveURL(/\/auth|login/);
    await expect(page.getByText(/sign in|login/i)).toBeVisible();
  });

  test('should show super admin login', async ({ page }) => {
    await page.goto('/super-admin');
    
    // Should show super admin authentication
    await expect(page.getByText(/super admin/i)).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
  });
});
