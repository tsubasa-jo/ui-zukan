import { test, expect } from '@playwright/test';
const toast = page => page.locator('[data-toast]');
const save = page => page.locator('[data-action="save"]');
const quality = (page, value) => page.locator(`[data-quality-switch="${value}"]`).click();
test.beforeEach(async ({ page }) => { await page.clock.install({ time: new Date('2026-11-14T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-11-14T00:00:01Z')); await page.goto('/#/p/toast'); await expect(save(page)).toBeVisible(); });
test('雑：1秒で消える', async ({ page }) => {
  await quality(page, 'rough'); await save(page).click();
  await page.clock.runFor(999); await expect(toast(page)).toHaveCount(1);
  await page.clock.runFor(101); await expect(toast(page)).toHaveCount(0);
});
test('丁寧：3秒後も残り、4.5秒で消える', async ({ page }) => {
  await save(page).click(); await page.clock.runFor(3000); await expect(toast(page)).toHaveCount(1);
  await page.clock.runFor(1500); await expect(toast(page)).toHaveCount(0);
});
for (const [name, value, overlap] of [['丁寧：保存ボタンに重ならない', 'polished', false], ['雑：保存ボタンに重なる', 'rough', true]]) {
  test(name, async ({ page }) => {
    await quality(page, value); await save(page).click(); await page.clock.runFor(200);
    const a = await save(page).boundingBox(), b = await toast(page).boundingBox();
    expect(a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height).toBe(overlap);
  });
}
test('丁寧：5回押しても1つだけ／雑：5回押すと5つ', async ({ page }) => {
  for (const [value, count] of [['polished', 1], ['rough', 5]]) {
    await quality(page, value);
    for (let i = 0; i < 5; i++) await save(page).click();
    await expect(toast(page)).toHaveCount(count);
  }
});
test('丁寧：マウスを乗せている間は消えない', async ({ page }) => {
  await save(page).click(); await page.clock.runFor(200); await toast(page).hover(); await page.clock.runFor(6000);
  await expect(toast(page)).toHaveCount(1); await page.mouse.move(0, 0); await page.clock.runFor(4100);
  await expect(toast(page)).toHaveCount(0);
});
test('丁寧：role=status がある', async ({ page }) => {
  await save(page).click(); await expect(toast(page)).toHaveAttribute('role', 'status');
  await expect(toast(page)).toHaveAttribute('aria-live', 'polite');
});
test('表示中に雑・丁寧を切り替えても、古いトーストが後から出ない', async ({ page }) => {
  await save(page).click(); await quality(page, 'rough'); await save(page).click();
  await quality(page, 'polished'); await page.clock.runFor(6000); await expect(toast(page)).toHaveCount(0);
});
test('丁寧：フォーカス中は止まり、離れたら残り時間で消える', async ({ page }) => {
  await save(page).click(); await page.clock.runFor(2000); await toast(page).focus();
  await page.clock.runFor(6000); await expect(toast(page)).toHaveCount(1);
  await save(page).focus(); await page.clock.runFor(2100); await expect(toast(page)).toHaveCount(0);
});
test('reduced-motion ではトーストを動かさない', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await save(page).click();
  await expect(toast(page)).toHaveCSS('animation-name', 'none');
});
test('表示中に枠やカードを切り替えても古いトーストを残さない', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await save(page).click(); await page.locator('[data-frame-switch="pc"]').click();
  await expect(toast(page)).toHaveCount(0); await save(page).click();
  await page.evaluate(() => { location.hash = '#/'; }); await expect(save(page)).toHaveCount(0);
  await page.locator('[data-pattern-id="toast"]').click(); await expect(save(page)).toBeVisible();
  await page.clock.runFor(6000); await expect(toast(page)).toHaveCount(0); expect(errors).toEqual([]);
});
