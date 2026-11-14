import { test, expect } from '@playwright/test';

test('ページが開き、題名と #app がある', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('さわれるUI図鑑');
  await expect(page.locator('#app')).toBeAttached();
});
test('横スクロールが起きない', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});
