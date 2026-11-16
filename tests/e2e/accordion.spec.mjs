import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('丁寧：Enter でも Space でも開閉し、aria-expanded が変わる', async ({ page }) => {
  const view = await openDemo(page, 'accordion');
  const buttons = view.locator('h3 button');
  await buttons.first().focus();
  await page.keyboard.press('Enter');
  await expect(buttons.first()).toHaveAttribute('aria-expanded', 'true');
  const id = await buttons.first().getAttribute('aria-controls');
  await expect(view.locator(`[id="${id}"]`)).toContainText('無料');
  await buttons.nth(1).click();
  await expect(buttons.first()).toHaveAttribute('aria-expanded', 'true');
  await expect(buttons.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await buttons.first().focus(); await page.keyboard.press('Space');
  await expect(buttons.first()).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Space');
  await expect(buttons.first()).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(buttons.first()).toHaveAttribute('aria-expanded', 'false');
});
test('丁寧：見出しの行は高さ44px以上', async ({ page }) => {
  const view = await openDemo(page, 'accordion');
  await expect(view.locator('h3 button')).toHaveCount(4);
  for (const button of await view.locator('h3 button').all()) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
});
test('雑：見出しに Tab で届かない', async ({ page }) => {
  const view = await openDemo(page, 'accordion', { quality: 'rough' });
  await expect(view.locator('[data-question]')).toHaveCount(4);
  expect(await view.locator('[data-question]').evaluateAll(nodes => nodes.every(el => el.tagName === 'DIV' && el.tabIndex === -1))).toBe(true);
  await page.locator('[data-quality-switch="rough"]').focus();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await view.locator('[data-question]').evaluateAll(nodes => nodes.includes(document.activeElement))).toBe(false);
  }
  await view.locator('[data-question]').first().click();
  await expect(view.locator('[data-answer]').first()).toBeVisible();
});
