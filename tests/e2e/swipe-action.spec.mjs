import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

async function swipe(page, row, dx, dy = 0) {
  await row.scrollIntoViewIfNeeded();
  const box = await row.boundingBox();
  const x = box.x + box.width - 16, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}

test('丁寧：60px 左に引いて離すと data-offset が -80 になる', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'マウスのドラッグはmacで検査する');
  const view = await openDemo(page, 'swipe-action');
  const row = view.locator('[data-row]').first();
  await swipe(page, row, -30);
  await expect(row).toHaveAttribute('data-offset', '0');
  await swipe(page, row, -60);
  await expect(row).toHaveAttribute('data-offset', '-80');
});
test('丁寧：別の行を開くと、前の行は閉じる', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'マウスのドラッグはmacで検査する');
  const view = await openDemo(page, 'swipe-action');
  const rows = view.locator('[data-row]');
  await swipe(page, rows.nth(0), -60); await swipe(page, rows.nth(1), -60);
  await expect(rows.nth(0)).toHaveAttribute('data-offset', '0');
  await expect(rows.nth(1)).toHaveAttribute('data-offset', '-80');
  await view.getByRole('heading').click();
  await expect(rows.nth(1)).toHaveAttribute('data-offset', '0');
});
test('丁寧：幅の60%以上引くと消え、「取り消す」で戻る', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'マウスのドラッグはmacで検査する');
  const view = await openDemo(page, 'swipe-action');
  const before = await view.locator('[data-row]').evaluateAll(rows => rows.map(row => row.dataset.row));
  const row = view.locator('[data-row]').nth(1);
  await swipe(page, row, -(await row.boundingBox()).width * 0.65);
  await expect(view.locator('[data-row]')).toHaveCount(7);
  await expect(view.getByRole('status')).toContainText('削除しました');
  await view.getByRole('button', { name: '取り消す' }).click();
  expect(await view.locator('[data-row]').evaluateAll(rows => rows.map(row => row.dataset.row))).toEqual(before);
});
test('雑：30px 引いて離すと -30 のまま止まる', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'マウスのドラッグはmacで検査する');
  const view = await openDemo(page, 'swipe-action', { quality: 'rough' });
  const row = view.locator('[data-row]').first();
  await swipe(page, row, -30);
  await expect(row).toHaveAttribute('data-offset', '-30');
});
test('一覧の touch-action が 丁寧は pan-y、雑は none', async ({ page }) => {
  for (const [quality, value] of [['polished', 'pan-y'], ['rough', 'none']]) {
    const view = await openDemo(page, 'swipe-action', { quality });
    await expect(view.locator('[data-mailbox]')).toHaveCSS('touch-action', value);
    await expect(view).toHaveCSS('touch-action', value);
    await expect(view.locator('[data-row]')).toHaveCount(8);
    await expect(view.locator('[data-row]').first()).toHaveAttribute('data-offset', '0');
  }
});
test('丁寧：縦に動き始めたら横には追従しない', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'マウスのドラッグはmacで検査する');
  const view = await openDemo(page, 'swipe-action');
  const row = view.locator('[data-row]').first();
  const box = await row.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, y + 16); await page.mouse.move(x - 70, y + 20);
  await page.mouse.up();
  await expect(row).toHaveAttribute('data-offset', '0');
});
