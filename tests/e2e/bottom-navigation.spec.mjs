import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('丁寧：4項目で文字が見える／雑：6項目で文字が無い', async ({ page }) => {
  const view = await openDemo(page, 'bottom-navigation');
  const buttons = view.locator('nav button');
  await expect(buttons).toHaveCount(4);
  for (const name of ['ホーム', '検索', '通知', 'マイページ']) await expect(view.getByRole('button', { name, exact: true })).toBeVisible();
  const widths = [];
  for (const button of await buttons.all()) { const box = await button.boundingBox(); expect(box.height).toBeGreaterThanOrEqual(49); widths.push(box.width); }
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
  await view.getByRole('button', { name: '通知', exact: true }).click();
  await expect(view.getByRole('heading')).toHaveText('通知');
  await expect(view.getByRole('button', { name: '通知', exact: true })).toHaveAttribute('aria-current', 'page');
  const rough = await openDemo(page, 'bottom-navigation', { quality: 'rough' });
  await expect(rough.locator('nav button')).toHaveCount(6);
  for (const button of await rough.locator('nav button').all()) {
    expect(await button.innerText()).not.toMatch(/[ぁ-んァ-ヶ一-龠]/);
    expect((await button.boundingBox()).height).toBe(36);
  }
});

test('丁寧：今いる項目を押すと一覧が一番上に戻る', async ({ page }) => {
  for (const quality of ['polished', 'rough']) {
    const view = await openDemo(page, 'bottom-navigation', { quality });
    const list = view.locator('[data-navigation-content]');
    await list.evaluate(el => { el.scrollTop = 400; });
    await expect.poll(() => list.evaluate(el => el.scrollTop)).toBe(400);
    await view.locator('nav button').first().click();
    await expect.poll(() => list.evaluate(el => el.scrollTop)).toBe(quality === 'polished' ? 0 : 400);
  }
});

test('丁寧：一覧は縦にスクロールできる（touch-action が pan-y）', async ({ page }) => {
  const view = await openDemo(page, 'bottom-navigation');
  const list = view.locator('[data-navigation-content]');
  await expect(list).toHaveCSS('touch-action', 'pan-y');
  await expect(list).toHaveCSS('overflow-y', 'auto');
  expect(await list.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  expect(await view.locator('style').textContent()).toContain('env(safe-area-inset-bottom)');
});
