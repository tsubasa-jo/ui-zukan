import { test, expect } from '@playwright/test';
const modal = page => page.locator('[data-modal]');
const open = page => page.locator('[data-action="open"]');
test.beforeEach(async ({ page }) => { await page.goto('/#/p/modal'); await expect(open(page)).toBeVisible(); });
async function backdrop(page) {
  const box = await page.locator('[data-backdrop]').boundingBox();
  await page.mouse.click(box.x + 3, box.y + 3);
}
test('丁寧：Esc・幕・閉じるボタンのそれぞれで閉じる', async ({ page }) => {
  for (const close of [() => page.keyboard.press('Escape'), () => backdrop(page), () => page.locator('[data-action="close"]').click()]) {
    await open(page).click(); await expect(modal(page)).toBeVisible(); await close(); await expect(modal(page)).toHaveCount(0);
  }
});
test('雑：Esc と幕では閉じない', async ({ page }) => {
  await page.locator('[data-quality-switch="rough"]').click(); await open(page).click();
  await page.keyboard.press('Escape'); await backdrop(page); await expect(modal(page)).toBeVisible();
  await expect(page.locator('[data-action="close"]')).toHaveCount(0);
  await modal(page).getByRole('button', { name: 'キャンセル', exact: true }).click(); await expect(modal(page)).toHaveCount(0);
});
test('丁寧：Tab を10回押してもフォーカスがモーダルの外に出ない', async ({ page }) => {
  await open(page).click();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press(i % 3 ? 'Tab' : 'Shift+Tab');
    expect(await modal(page).evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await expect(modal(page)).toHaveAttribute('role', 'dialog'); await expect(modal(page)).toHaveAttribute('aria-modal', 'true');
  const label = await modal(page).getAttribute('aria-labelledby'); await expect(page.locator(`[id="${label}"]`)).toHaveText('本当に削除しますか？');
});
test('丁寧：閉じると「削除する」ボタンにフォーカスが戻る', async ({ page }) => {
  await open(page).click(); await page.keyboard.press('Escape'); await expect(open(page)).toBeFocused();
});
test('丁寧：開いている間は背景がスクロールしない', async ({ page }) => {
  const background = page.locator('[data-modal-background]'); await open(page).click();
  const before = await background.evaluate(el => el.scrollTop);
  const box = await background.boundingBox(); await page.mouse.move(box.x + 4, box.y + 4); await page.mouse.wheel(0, 300);
  await expect.poll(() => background.evaluate(el => el.scrollTop)).toBe(before);
  await expect(background).toHaveCSS('overflow-y', 'hidden');
  await page.keyboard.press('Escape'); await expect(background).toHaveCSS('overflow-y', 'auto');
});
test('開いたまま一覧に戻ると、モーダルが残らない', async ({ page }) => {
  await page.goto('/#/'); await page.locator('[data-pattern-id="modal"]').click(); await open(page).click();
  await page.goBack(); await expect(modal(page)).toHaveCount(0); await expect(page.locator('[data-backdrop]')).toHaveCount(0);
  await page.goForward(); await expect(open(page)).toBeVisible(); await expect(page.locator('[data-modal-background]')).toHaveCSS('overflow-y', 'auto');
});
test('雑：背景がスクロールし、フォーカスも背景に移る', async ({ page }) => {
  await page.locator('[data-quality-switch="rough"]').click(); await open(page).click();
  const background = page.locator('[data-modal-background]'); await expect(background).toHaveCSS('overflow-y', 'auto');
  const box = await background.boundingBox(); await page.mouse.move(box.x + 4, box.y + 4); await page.mouse.wheel(0, 100);
  await expect.poll(() => background.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await modal(page).getByRole('button', { name: '削除', exact: true }).focus(); await page.keyboard.press('Tab');
  expect(await modal(page).evaluate(el => el.contains(document.activeElement))).toBe(false);
});
test('安全な接続向けの UUID API がなくても確認画面が開く', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(Crypto.prototype, 'randomUUID', { value: undefined, configurable: true }); });
  await page.reload(); await open(page).click(); await expect(modal(page)).toHaveAttribute('role', 'dialog');
});
test('背景と確認画面の縦スクロールをタッチ操作で妨げない', async ({ page }) => {
  await expect(page.locator('[data-role="viewport"]')).toHaveCSS('touch-action', 'pan-y');
  await expect(page.locator('[data-modal-background]')).toHaveCSS('touch-action', 'pan-y');
  await open(page).click(); await expect(page.locator('[data-backdrop]')).toHaveCSS('touch-action', 'pan-y');
  await expect(modal(page)).toHaveCSS('touch-action', 'pan-y');
  await page.evaluate(() => { location.hash = '#/'; }); await page.locator('[data-pattern-id="toast"]').click();
  await expect(page.locator('[data-action="save"]')).toBeVisible();
  await expect(page.locator('[data-role="viewport"]')).toHaveCSS('touch-action', 'none');
});
