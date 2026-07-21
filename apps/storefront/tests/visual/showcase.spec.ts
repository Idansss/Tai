import { expect, test } from '@playwright/test';

test.describe('storefront foundation', () => {
  test('homepage renders hero and gallery', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/From Africa,\s*to you\./i);
    await expect(page.getByRole('heading', { name: 'Shop by collection' })).toBeVisible();
    // Skip link is the first focusable element.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });

  test('visual baseline — homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home.png', { fullPage: true });
  });
});
