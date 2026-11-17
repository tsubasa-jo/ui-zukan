import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('丁寧：押すとすぐプレビューが「オン」になる', async ({ page }) => {
  const view = await openDemo(page, 'toggle-switch');
  await expect(view.locator('[data-preview]')).toContainText('オフ');
  await view.getByText('通知を受け取る', { exact: true }).click();
  await expect(view.locator('[data-preview]')).toContainText('オン');
  await expect(view.locator('[data-banner]')).toBeVisible();
  await expect(view.getByRole('button', { name: '保存', exact: true })).toHaveCount(0);
  const box = await view.getByRole('switch').boundingBox();
  expect(box.width).toBe(51); expect(box.height).toBe(31);
});
test('丁寧：role="switch" で aria-checked が切り替わり、Space でも切り替わる', async ({ page }) => {
  const view = await openDemo(page, 'toggle-switch');
  const control = view.getByRole('switch', { name: '通知を受け取る', exact: true });
  await expect(control).toHaveAttribute('aria-checked', 'false');
  await control.click(); await expect(control).toHaveAttribute('aria-checked', 'true');
  await control.focus(); await page.keyboard.press('Space');
  await expect(control).toHaveAttribute('aria-checked', 'false');
  await expect(view.locator('[data-preview]')).toContainText('オフ');
  await expect(view.locator('[data-banner]')).toBeHidden();
});
test('雑：保存を押すまでプレビューが変わらない', async ({ page }) => {
  const view = await openDemo(page, 'toggle-switch', { quality: 'rough' });
  const control = view.locator('[data-switch]');
  const box = await control.boundingBox(); expect(box.width).toBe(30); expect(box.height).toBe(16);
  await view.getByText('通知を受け取る', { exact: true }).click();
  await expect(control).toHaveAttribute('data-on', 'false');
  await control.click();
  await expect(view.locator('[data-preview]')).toContainText('オフ');
  await expect(view.locator('[data-banner]')).toBeHidden();
  await view.getByRole('button', { name: '保存', exact: true }).click();
  await expect(view.locator('[data-preview]')).toContainText('オン');
  await expect(view.locator('[data-banner]')).toBeVisible();
  await control.click(); await expect(view.locator('[data-preview]')).toContainText('オン');
  await view.getByRole('button', { name: '保存', exact: true }).click();
  await expect(view.locator('[data-preview]')).toContainText('オフ');
});
