import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  const time = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({ time }); await page.clock.pauseAt(time);
});
const rows = view => view.locator('[data-mail]');
const remove = (view, index = 0) => rows(view).nth(index).getByRole('button', { name: '削除', exact: true }).click();

test('丁寧：削除して「取り消す」を押すと、元と同じ位置に戻る', async ({ page }) => {
  const view = await openDemo(page, 'snackbar');
  const before = await rows(view).allTextContents();
  await remove(view, 1);
  await expect(rows(view)).toHaveCount(3);
  await expect(view.getByRole('status')).toContainText('削除しました');
  await view.getByRole('button', { name: '取り消す' }).click();
  expect(await rows(view).allTextContents()).toEqual(before);
  await expect(view.locator('[data-notice]')).toHaveCount(0);
});

test('丁寧：5.9秒では残り、6.1秒で消える／雑：1.6秒で消える', async ({ page }) => {
  let view = await openDemo(page, 'snackbar');
  await remove(view);
  await page.mouse.move(0, 0);
  await page.clock.runFor(5900);
  await expect(view.locator('[data-notice]')).toHaveCount(1);
  await page.clock.runFor(200);
  await expect(view.locator('[data-notice]')).toHaveCount(0);
  view = await openDemo(page, 'snackbar', { quality: 'rough' });
  await remove(view); await page.clock.runFor(1600);
  await expect(view.locator('[data-notice]')).toHaveCount(0);
});

test('雑：「取り消す」ボタンが無い', async ({ page }) => {
  const view = await openDemo(page, 'snackbar', { quality: 'rough' });
  await remove(view);
  await expect(view.locator('[data-notice]')).toHaveCount(1);
  await expect(view.getByRole('button', { name: '取り消す' })).toHaveCount(0);
  await expect(view.getByRole('status')).toHaveCount(0);
});

test('丁寧：続けて削除すると1つに入れ替わり、最新のメールだけ元の順に戻る／雑：積み重なる', async ({ page }) => {
  const view = await openDemo(page, 'snackbar');
  const before = await rows(view).allTextContents();
  await remove(view, 1); await page.clock.runFor(3000);
  await remove(view, 1);
  await page.mouse.move(0, 0);
  await expect(view.locator('[data-notice]')).toHaveCount(1);
  await page.clock.runFor(3100);
  await expect(view.locator('[data-notice]')).toHaveCount(1);
  await view.getByRole('button', { name: '取り消す' }).click();
  expect(await rows(view).allTextContents()).toEqual([before[0], before[2], before[3]]);
  const rough = await openDemo(page, 'snackbar', { quality: 'rough' });
  await remove(rough); await remove(rough);
  await expect(rough.locator('[data-notice]')).toHaveCount(2);
});

test('丁寧：マウスとフォーカスの両方が外れてから残り時間を進める', async ({ page }) => {
  const view = await openDemo(page, 'snackbar');
  await remove(view); await page.mouse.move(0, 0);
  await page.clock.runFor(2000);
  const notice = view.locator('[data-notice]');
  // Pointer Events を明示し、タッチ端末でもマウス入力時の停止を検査する。
  await notice.dispatchEvent('pointerenter', { pointerType: 'mouse' });
  await page.clock.runFor(7000);
  await expect(notice).toHaveCount(1);
  await view.getByRole('button', { name: '取り消す' }).focus();
  await page.clock.runFor(7000);
  await expect(notice).toHaveCount(1);
  await notice.dispatchEvent('pointerleave', { pointerType: 'mouse' });
  await page.clock.runFor(7000);
  await expect(notice).toHaveCount(1);
  await rows(view).first().getByRole('button').focus();
  await page.clock.runFor(3900); await expect(notice).toHaveCount(1);
  await page.clock.runFor(200); await expect(notice).toHaveCount(0);
});

test('表示中に切り替え、離脱しても古いお知らせが残らない', async ({ page }) => {
  const view = await openDemo(page, 'snackbar');
  await remove(view);
  await page.locator('[data-quality-switch="rough"]').click();
  await expect(view.locator('[data-notice]')).toHaveCount(0);
  await remove(view);
  await page.evaluate(() => { location.hash = '#/'; });
  await expect(page.locator('[data-demo]')).toHaveCount(0);
  await page.clock.runFor(10000);
  await expect(page.locator('[data-notice]')).toHaveCount(0);
});
