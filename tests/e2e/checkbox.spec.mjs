import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('丁寧：1件だけ選ぶと「すべて選択」が中間の状態になる', async ({ page }) => {
  const view = await openDemo(page, 'checkbox');
  await view.getByText('ご注文の確認', { exact: true }).click();
  await expect(view.locator('[data-mail]').first()).toBeChecked();
  await expect(view.getByRole('checkbox', { name: 'すべて選択', exact: true })).toHaveJSProperty('indeterminate', true);
  for (const row of await view.locator('label').all()) expect((await row.boundingBox()).height).toBeGreaterThanOrEqual(44);
});
test('丁寧：中間の状態で「すべて選択」を押すと4件とも選ばれる', async ({ page }) => {
  const view = await openDemo(page, 'checkbox');
  const all = view.getByRole('checkbox', { name: 'すべて選択', exact: true });
  await view.locator('[data-mail]').first().check();
  await expect(all).toHaveJSProperty('indeterminate', true);
  await all.click();
  await expect(view.locator('[data-mail]:checked')).toHaveCount(4);
  await expect(all).toBeChecked(); await expect(all).toHaveJSProperty('indeterminate', false);
  await all.click();
  await expect(view.locator('[data-mail]:checked')).toHaveCount(0);
  await expect(all).toHaveJSProperty('indeterminate', false);
});
test('丁寧：「2件選択中」と表示される', async ({ page }) => {
  const view = await openDemo(page, 'checkbox');
  await expect(view.locator('[aria-live="polite"]')).toHaveText('0件選択中');
  await view.locator('[data-mail]').nth(0).check();
  await view.locator('[data-mail]').nth(1).check();
  await expect(view.locator('[aria-live="polite"]')).toHaveText('2件選択中');
});
test('雑：1件だけ選んでも「すべて選択」は中間の状態にならない', async ({ page }) => {
  const view = await openDemo(page, 'checkbox', { quality: 'rough' });
  const all = view.locator('[data-all]');
  await view.getByText('ご注文の確認', { exact: true }).click();
  await expect(view.locator('[data-mail]:checked')).toHaveCount(0);
  await view.locator('[data-mail]').first().check();
  await expect(all).toHaveJSProperty('indeterminate', false);
  await all.click(); await expect(view.locator('[data-mail]:checked')).toHaveCount(4);
  await view.locator('[data-mail]').first().uncheck();
  await expect(all).toHaveJSProperty('indeterminate', false);
  await expect(view.locator('[aria-live]')).toHaveCount(0);
});
