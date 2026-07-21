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

  test('brand logo and install metadata are available', async ({ page, request }) => {
    await page.goto('/');

    const homeLink = page.getByRole('link', { name: 'F.A.T.U home' });
    await expect(homeLink).toBeVisible();
    await expect(homeLink.locator('img')).toHaveAttribute('src', /fatu-logo\.png/);
    await expect(page.getByRole('img', { name: 'F.A.T.U — From Africa To You' })).toBeVisible();

    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBeTruthy();
    await expect(manifestResponse.json()).resolves.toMatchObject({
      name: 'From Africa To You',
      short_name: 'F.A.T.U',
      icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
    });

    for (const path of ['/icon.png', '/apple-icon.png', '/opengraph-image.png']) {
      const response = await request.get(path);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toBe('image/png');
    }
  });

  test('visual baseline — homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home.png', { fullPage: true });
  });
});
