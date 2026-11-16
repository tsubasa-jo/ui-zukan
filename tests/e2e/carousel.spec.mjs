import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('雑：2.1秒で次のスライドに進む／丁寧：10秒たっても進まない', async ({ page }) => {
  const time = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  let view = await openDemo(page, 'carousel', { quality: 'rough' });
  await expect(view.locator('[data-slide]:visible')).toHaveText('1');
  await page.clock.runFor(2100);
  await expect(view.locator('[data-slide]:visible')).toHaveText('2');
  const previous = await view.locator('[data-demo]').elementHandle();
  await page.locator('[data-quality-switch="polished"]').click();
  await page.clock.runFor(2100);
  expect(await previous.evaluate(root => root.querySelector('[data-slide]:not([hidden])').textContent)).toBe('2');
  view = await openDemo(page, 'carousel');
  await page.clock.runFor(10000);
  await expect(view.locator('[aria-live]')).toHaveText('1 / 5');
  expect(await view.locator('[data-scroller]').evaluate(el => el.scrollLeft)).toBe(0);
});
test('丁寧：次へを押すと「2 / 5」になる', async ({ page }) => {
  const view = await openDemo(page, 'carousel');
  await view.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(view.locator('[aria-live]')).toHaveText('2 / 5');
  await expect(view.locator('[data-dot][aria-current="true"]')).toHaveCount(1);
});
test('丁寧：各スライドに「n / 5」の aria-label がある', async ({ page }) => {
  const view = await openDemo(page, 'carousel');
  await expect(view.locator('[aria-roledescription="カルーセル"]')).toHaveCount(1);
  const slides = view.locator('[aria-roledescription="スライド"]');
  await expect(slides).toHaveCount(5);
  for (let i = 0; i < 5; i++) await expect(slides.nth(i)).toHaveAttribute('aria-label', `${i + 1} / 5`);
});
