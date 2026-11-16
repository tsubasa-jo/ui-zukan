import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('丁寧：乗せて400msでは出ず、600msで出る', async ({ page }) => {
  const time = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  const view = await openDemo(page, 'tooltip');
  await view.getByRole('button', { name: '保存', exact: true }).hover();
  await page.clock.runFor(400);
  await expect(view.getByRole('tooltip')).toHaveCount(0);
  await page.clock.runFor(200);
  await expect(view.getByRole('tooltip')).toHaveText('変更を保存');
  // マウスで表示したときも、フォーカスの位置によらずEscで閉じる。
  await page.keyboard.press('Escape');
  await expect(view.getByRole('tooltip')).toHaveCount(0);
  await page.clock.runFor(600);
  await expect(view.getByRole('tooltip')).toHaveCount(0);
});
test('丁寧：Tab でフォーカスするとすぐ出て、Esc で消える', async ({ page }) => {
  const view = await openDemo(page, 'tooltip');
  await page.locator('[data-quality-switch="polished"]').focus();
  await page.keyboard.press('Tab');
  const button = view.getByRole('button', { name: '保存', exact: true });
  await expect(button).toBeFocused();
  await expect(view.getByRole('tooltip')).toBeVisible();
  await expect(button).toHaveAttribute('aria-describedby', await view.getByRole('tooltip').getAttribute('id'));
  await page.keyboard.press('Escape');
  await expect(view.getByRole('tooltip')).toHaveCount(0);
  await expect(button).toBeFocused();
});
test('丁寧：説明の上にマウスを動かしても消えない', async ({ page }) => {
  const time = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  const view = await openDemo(page, 'tooltip');
  await view.getByRole('button', { name: '保存', exact: true }).hover();
  await page.clock.runFor(600);
  await view.getByRole('tooltip').hover();
  await page.clock.runFor(200);
  await expect(view.getByRole('tooltip')).toBeVisible();
  await view.locator('h3').hover();
  await page.clock.runFor(99);
  await expect(view.getByRole('tooltip')).toBeVisible();
  await page.clock.runFor(1);
  await expect(view.getByRole('tooltip')).toHaveCount(0);
});
test('丁寧：説明がボタンに重ならない／雑：重なる', async ({ page }) => {
  const time = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  for (const quality of ['polished', 'rough']) {
    const view = await openDemo(page, 'tooltip', { quality });
    const button = view.getByRole('button', { name: '保存', exact: true });
    await button.hover(); await page.clock.runFor(600);
    const a = await button.boundingBox(), b = await view.locator('[data-tip]:visible').boundingBox();
    const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    expect(overlaps).toBe(quality === 'rough');
  }
});
test('雑：フォーカスしても出ない', async ({ page }) => {
  const view = await openDemo(page, 'tooltip', { quality: 'rough' });
  await view.getByRole('button', { name: '保存', exact: true }).focus();
  await expect(view.locator('[data-tip]:visible')).toHaveCount(0);
});
