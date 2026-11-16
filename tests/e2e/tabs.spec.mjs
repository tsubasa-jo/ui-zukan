import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('丁寧：→ を押すと次のタブが選ばれ、パネルが切り替わる', async ({ page }) => {
  const view = await openDemo(page, 'tabs');
  const first = view.getByRole('tab', { name: '概要', exact: true });
  await first.focus(); await page.keyboard.press('ArrowRight');
  const next = view.getByRole('tab', { name: '仕様', exact: true });
  await expect(next).toBeFocused(); await expect(next).toHaveAttribute('aria-selected', 'true');
  await expect(first).toHaveAttribute('aria-selected', 'false');
  const panelId = await next.getAttribute('aria-controls');
  await expect(view.locator(`[id="${panelId}"]`)).toBeVisible();
  await expect(view.getByRole('tabpanel')).toHaveCount(1);
  await expect(view.getByRole('tabpanel')).toContainText('容量');
  await page.keyboard.press('ArrowLeft'); await expect(first).toBeFocused();
});

test('丁寧：tabindex=0 は選択中のタブだけ', async ({ page }) => {
  const view = await openDemo(page, 'tabs');
  for (const name of ['概要', '仕様', 'レビュー']) {
    await view.getByRole('tab', { name, exact: true }).click();
    await expect(view.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await expect(view.locator('[role="tab"][tabindex="0"]')).toHaveAttribute('aria-selected', 'true');
    await expect(view.locator('[role="tab"][tabindex="-1"]')).toHaveCount(2);
  }
});

test('丁寧：End で最後、Home で最初のタブへ', async ({ page }) => {
  const view = await openDemo(page, 'tabs');
  await view.getByRole('tab', { name: '概要', exact: true }).focus();
  await page.keyboard.press('End');
  await expect(view.getByRole('tab', { name: 'レビュー', exact: true })).toBeFocused();
  await expect(view.getByRole('tab', { name: 'レビュー', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(view.getByRole('tab', { name: '概要', exact: true })).toBeFocused();
  await expect(view.getByRole('tab', { name: '概要', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(view.getByRole('tab', { name: 'レビュー', exact: true })).toBeFocused();
});

test('雑：role="tab" が無い', async ({ page }) => {
  const view = await openDemo(page, 'tabs', { quality: 'rough' });
  await expect(view.locator('[role="tab"]')).toHaveCount(0);
  await expect(view.getByRole('button')).toHaveCount(3);
  await expect(view.locator('button[tabindex="-1"]')).toHaveCount(0);
  await view.getByRole('button', { name: '仕様', exact: true }).click();
  await expect(view.locator('[data-tab-panel]:visible')).toContainText('容量');
});
