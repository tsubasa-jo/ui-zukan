import { test, expect } from '@playwright/test';

const mounts = page => page.evaluate(() => window.__fixtureMounts ?? 0);
const viewport = page => page.locator('[data-role="viewport"]');

test('トーストのカードに枠の切り替えがあり、プルトゥリフレッシュにはない', async ({ page }) => {
  await page.goto('/#/p/toast');
  await expect(page.locator('[data-frame-switch]')).toHaveCount(2);
  await page.evaluate(() => { location.hash = "#/"; });
  await page.locator('[data-pattern-id="pull-to-refresh"]').click();
  await expect(page.locator('[data-frame-switch]')).toHaveCount(0);
  await expect(viewport(page)).toHaveCount(1);
});
test('雑・丁寧を切り替えると aria-pressed が入れ替わる', async ({ page }) => {
  await page.goto('/#/p/toast');
  const rough = page.locator('[data-quality-switch="rough"]');
  const polished = page.locator('[data-quality-switch="polished"]');
  await expect(polished).toHaveText('丁寧');
  await expect(polished).toHaveAttribute('aria-pressed', 'true');
  await expect(rough).toHaveAttribute('aria-pressed', 'false');
  await rough.click();
  await expect(rough).toHaveAttribute('aria-pressed', 'true');
  await expect(polished).toHaveAttribute('aria-pressed', 'false');
  await polished.click();
  await expect(polished).toHaveAttribute('aria-pressed', 'true');
});
test('切り替えやカードの移動で、見本が1つより多く残らない', async ({ page }) => {
  await page.goto('/?fixture=1#/p/_fixture');
  await expect.poll(() => mounts(page)).toBe(1);
  for (let i = 0; i < 5; i++) {
    const quality = i % 2 === 0 ? 'rough' : 'polished';
    const frame = i % 2 === 0 ? 'pc' : 'phone';
    await page.locator(`[data-quality-switch="${quality}"]`).click();
    await page.locator(`[data-frame-switch="${frame}"]`).click();
    await expect.poll(() => mounts(page)).toBe(1);
    await expect(page.locator('[data-mounted]')).toHaveCount(1);
    await expect(page.locator('[data-mounted]')).toHaveAttribute('data-quality', quality);
    await expect(page.locator('[data-mounted]')).toHaveAttribute('data-frame', frame);
  }
  await page.evaluate(() => { location.hash = '#/'; });
  await expect.poll(() => mounts(page)).toBe(0);
  await expect(page.locator('[data-mounted]')).toHaveCount(0);
  await page.goBack();
  await expect.poll(() => mounts(page)).toBe(1);
  await page.evaluate(() => { location.hash = "#/"; });
  await page.locator('[data-pattern-id="toast"]').click();
  await expect.poll(() => mounts(page)).toBe(0);
});
test('iphone で枠が画面からはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/p/toast');
  for (const frame of ['phone', 'pc']) {
    await page.locator(`[data-frame-switch="${frame}"]`).click();
    const box = await viewport(page).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
});
test('初期の枠はデータの先頭で、表示領域が操作を閉じ込める', async ({ page }) => {
  await page.goto('/#/p/toast');
  await expect(page.locator('[data-frame-switch="phone"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(viewport(page)).toHaveCSS('overflow', 'hidden');
  await expect(viewport(page)).toHaveCSS('position', 'relative');
  await expect(viewport(page)).toHaveCSS('overscroll-behavior', 'contain');
  await expect(viewport(page)).toHaveCSS('touch-action', 'none');
  await page.evaluate(() => { location.hash = "#/"; });
  await page.locator('[data-pattern-id="modal"]').click();
  await expect(page.locator('[data-frame-switch="pc"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-quality-switch="polished"]')).toHaveAttribute('aria-pressed', 'true');
});
test('375pxでも枠が収まり、スマホとPCの縦横比を保つ', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/p/toast');
  for (const [frame, ratio] of [['phone', 375 / 667], ['pc', 720 / 450]]) {
    await page.locator(`[data-frame-switch="${frame}"]`).click();
    const box = await viewport(page).boundingBox();
    expect(box.width / box.height).toBeCloseTo(ratio, 2);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
});
test('3つの見本を開いて切り替えても未処理エラーにならない', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/p/toast');
  for (const id of ['toast', 'modal', 'pull-to-refresh']) {
    await page.evaluate(() => { location.hash = "#/"; });
    await page.locator(`[data-pattern-id="${id}"]`).click();
    await expect(viewport(page).locator('[data-demo]')).toHaveCount(1);
    await page.locator('[data-quality-switch="rough"]').click();
    await expect(viewport(page).locator('[data-demo]')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});
test('テスト用見本は fixture=1 のときだけ一覧の末尾に出る', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-pattern-id="_fixture"]')).toHaveCount(0);
  await page.goto('/?fixture=1#/');
  await expect(page.locator('[data-pattern-id]')).toHaveCount(4);
  await expect(page.locator('[data-pattern-id]').last()).toHaveAttribute('data-pattern-id', '_fixture');
  await page.goto('/#/p/_fixture');
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('[data-mounted]')).toHaveCount(0);
});
test('読み込み中に切り替えたら最後の設定だけを組み込む', async ({ page }) => {
  let release;
  let requested;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { requested = resolve; });
  await page.route('**/demos/_fixture.js', async route => { requested(); await gate; await route.continue(); });
  await page.goto('/?fixture=1#/p/_fixture');
  await started;
  await page.locator('[data-quality-switch="rough"]').click();
  await page.locator('[data-frame-switch="pc"]').click();
  release();
  await expect.poll(() => mounts(page)).toBe(1);
  await expect(page.locator('[data-mounted]')).toHaveAttribute('data-quality', 'rough');
  await expect(page.locator('[data-mounted]')).toHaveAttribute('data-frame', 'pc');
});
test('読み込み中にカードを離れたら見本を組み込まない', async ({ page }) => {
  let release;
  let requested;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { requested = resolve; });
  await page.route('**/demos/_fixture.js', async route => { requested(); await gate; await route.continue(); });
  await page.goto('/?fixture=1#/p/_fixture');
  await started;
  await page.evaluate(() => { location.hash = "#/"; });
  await page.locator('[data-pattern-id="toast"]').click();
  const loaded = page.waitForResponse('**/demos/_fixture.js');
  release();
  await loaded;
  // 同じimportの完了まで待ち、遅れてmountされないことを確かめる。
  await page.evaluate(() => import('/demos/_fixture.js'));
  expect(await mounts(page)).toBe(0);
  await expect(page.locator('[data-mounted]')).toHaveCount(0);
});
