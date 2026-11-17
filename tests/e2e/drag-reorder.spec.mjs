import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

const original = ['牛乳', '卵', 'パン', 'りんご', 'コーヒー'];
const order = view => view.locator('[data-item]').evaluateAll(rows => rows.map(row => row.dataset.item));

test('丁寧：牛乳のつまみを2行ぶん下にドラッグすると、卵・パン・牛乳の順になる', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'マウスのドラッグはmacで検査する');
  const view = await openDemo(page, 'drag-reorder');
  const handle = view.getByRole('button', { name: '牛乳を並べ替える' });
  const box = await handle.boundingBox();
  const row = await view.locator('[data-item]').first().boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, y + row.height * 2, { steps: 10 });
  await expect(view.locator('[data-item="牛乳"]')).toHaveAttribute('data-lifted', 'true');
  await page.mouse.up();
  expect(await order(view)).toEqual(['卵', 'パン', '牛乳', 'りんご', 'コーヒー']);
});
test('丁寧：Space・↓・Space で1つ下がり、「2番目に移動しました」と伝える', async ({ page }) => {
  const view = await openDemo(page, 'drag-reorder');
  const handle = view.getByRole('button', { name: '牛乳を並べ替える' });
  await handle.focus(); await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space');
  expect(await order(view)).toEqual(['卵', '牛乳', 'パン', 'りんご', 'コーヒー']);
  await expect(view.locator('[aria-live="polite"]')).toHaveText('牛乳を2番目に移動しました');
  await expect(handle).toBeFocused();
  await expect(handle).toHaveAttribute('aria-pressed', 'false');
});
test('丁寧：持ち上げてから Esc で元の順に戻る', async ({ page }) => {
  const view = await openDemo(page, 'drag-reorder');
  const handle = view.getByRole('button', { name: '牛乳を並べ替える' });
  await handle.focus(); await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('Escape');
  expect(await order(view)).toEqual(original);
  await expect(handle).toBeFocused();
  await expect(handle).toHaveAttribute('aria-pressed', 'false');
});
test('雑：つまみが無く、キーボードでは動かせない', async ({ page }) => {
  const view = await openDemo(page, 'drag-reorder', { quality: 'rough' });
  await expect(view.locator('[data-handle]')).toHaveCount(0);
  await view.locator('[data-item]').first().focus();
  await page.keyboard.press('Space'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space');
  expect(await order(view)).toEqual(original);
});
test('丁寧：つまみは44px四方で、縦スクロールと動きを減らす設定に対応する', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const view = await openDemo(page, 'drag-reorder');
  const handle = view.locator('[data-handle]').first();
  const box = await handle.boundingBox();
  expect(box.width).toBe(44); expect(box.height).toBe(44);
  await expect(handle).toHaveCSS('touch-action', 'none');
  await expect(view.locator('[data-item]').first()).toHaveCSS('touch-action', 'pan-y');
  await expect(view).toHaveCSS('touch-action', 'pan-y');
  // サイト全体の reduced-motion 指定で .01ms になる。実質0として扱う。
  const duration = await view.locator('[data-item]').first().evaluate(el => parseFloat(getComputedStyle(el).transitionDuration));
  expect(duration).toBeLessThan(0.001);
});
test('丁寧：持ち上げたまま Tab・Shift+Tab で別のつまみへ移れる', async ({ page }) => {
  const view = await openDemo(page, 'drag-reorder');
  const milk = view.getByRole('button', { name: '牛乳を並べ替える' });
  const eggs = view.getByRole('button', { name: '卵を並べ替える' });
  await milk.focus(); await page.keyboard.press('Space'); await page.keyboard.press('Tab');
  await expect(eggs).toBeFocused();
  await expect(milk).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Space'); await page.keyboard.press('Shift+Tab');
  await expect(milk).toBeFocused();
  await expect(eggs).toHaveAttribute('aria-pressed', 'false');
  expect(await order(view)).toEqual(original);
});
