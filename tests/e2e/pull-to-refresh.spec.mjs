import { test, expect } from '@playwright/test';
const list = page => page.locator('[data-list]');
const indicator = page => page.locator('[data-ptr-indicator]');
async function drag(page, distance, release = true) {
  await list(page).scrollIntoViewIfNeeded();
  const b = await list(page).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + 24);
  await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + 24 + distance, { steps: 8 });
  if (release) await page.mouse.up();
}
test.beforeEach(async ({ page }) => { await page.clock.install({ time: new Date('2026-11-14T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-11-14T00:00:01Z')); await page.goto('/#/p/pull-to-refresh'); await expect(list(page)).toBeVisible(); });
test('丁寧：100px 引いて離しても更新しない（表示上50px）', async ({ page }) => {
  await drag(page, 100, false); await expect(indicator(page)).toHaveText('引っ張って更新');
  await expect(list(page)).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 50)');
  await page.mouse.up(); await page.clock.runFor(1300); await expect(list(page).locator('li')).toHaveCount(8);
});
test('丁寧：160px 引くと「離すと更新」になり、離すと1件増えて「更新しました」', async ({ page }) => {
  await drag(page, 160, false); await expect(indicator(page)).toHaveText('離すと更新'); await page.mouse.up();
  await expect(indicator(page).locator('[data-spinner]')).toBeVisible();
  await page.clock.runFor(1199); await expect(list(page).locator('li')).toHaveCount(8);
  await page.clock.runFor(1); await expect(list(page).locator('li')).toHaveCount(9); await expect(indicator(page)).toHaveText('更新しました');
  await page.clock.runFor(1499); await expect(indicator(page)).toHaveText('更新しました');
  await page.clock.runFor(1); await expect(indicator(page)).toBeEmpty();
});
test('雑：10px 動かしただけで更新が始まる', async ({ page }) => {
  await page.locator('[data-quality-switch="rough"]').click(); await drag(page, 10, false);
  await expect(indicator(page)).toBeEmpty(); await page.clock.runFor(1200); await expect(list(page).locator('li')).toHaveCount(9); await page.mouse.up();
});
test('リストを下にスクロールした状態では引っ張りが始まらない', async ({ page }) => {
  for (const quality of ['polished', 'rough']) {
    await page.locator(`[data-quality-switch="${quality}"]`).click();
    await list(page).evaluate(el => { el.scrollTop = 100; }); await drag(page, 160);
    await page.clock.runFor(1300); await expect(list(page).locator('li')).toHaveCount(8); await expect(indicator(page)).toBeEmpty();
  }
});
test('更新中に雑・丁寧を切り替えても、エラーが出ず、古い更新の結果が後から足されない', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const quality of ['rough', 'polished']) {
    await drag(page, 160); await page.locator(`[data-quality-switch="${quality}"]`).click();
    await page.clock.runFor(3000); await expect(list(page).locator('li')).toHaveCount(8);
  }
  expect(errors).toEqual([]);
});
test('表示領域に overscroll-behavior: contain がある', async ({ page }) => {
  await expect(page.locator('[data-role="viewport"]')).toHaveCSS('overscroll-behavior', 'contain'); await expect(list(page)).toHaveCSS('touch-action', 'pan-x');
});
test('更新中にカードを離れたら結果を残さない', async ({ page }) => {
  await drag(page, 160); await page.evaluate(() => { location.hash = '#/'; });
  await expect(list(page)).toHaveCount(0); await page.clock.runFor(3000);
  await page.locator('[data-pattern-id="pull-to-refresh"]').click(); await expect(list(page).locator('li')).toHaveCount(8);
});
test('先頭から上へドラッグするとリストを下にスクロールできる', async ({ page }) => {
  await list(page).scrollIntoViewIfNeeded();
  const b = await list(page).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + 180);
  await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + 40, { steps: 8 }); await page.mouse.up();
  await expect.poll(() => list(page).evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(list(page)).toHaveCSS('touch-action', 'pan-y');
  await expect(page.locator('[data-role="viewport"]')).toHaveCSS('touch-action', 'pan-y');
});
