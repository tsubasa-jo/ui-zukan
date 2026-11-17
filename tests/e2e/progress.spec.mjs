import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';
import { PATTERNS } from '../../site/js/data/patterns.js';

const cardMark = page => page.locator('.pattern-card [data-mark="touched"]');
const listMark = page => page.locator('[data-pattern-id="toast"] [data-mark="touched"]');

test('カードを開いただけでは「触」が付かず、見本を押すと付く', async ({ page }) => {
  const viewport = await openDemo(page, 'toast');
  await expect(cardMark(page)).toHaveCount(0);
  await expect(listMark(page)).toHaveCount(0);
  await expect(viewport).not.toContainText('トースト');
  await expect(viewport).not.toContainText('Toast');
  await viewport.getByRole('button', { name: '保存', exact: true }).click();
  await expect(cardMark(page)).toBeVisible();
  await expect(cardMark(page).locator('.visually-hidden')).toHaveText('触った');
  // iPhone ではカードを開いている間、一覧が隠れている。
  await expect(listMark(page)).toHaveCount(1);
  await page.evaluate(() => { location.hash = '#/'; });
  await expect(listMark(page)).toBeVisible();
  await page.locator('[data-pattern-id="modal"]').click();
  await expect(page.locator('[data-role="viewport"] [data-demo]')).toHaveCount(1);
  await page.locator('[data-role="viewport"] button').first().focus();
  await page.keyboard.press('Enter');
  await expect(cardMark(page)).toHaveCount(1);
});

test('印はページを読み込み直しても残る', async ({ page }) => {
  const viewport = await openDemo(page, 'toast');
  await viewport.getByRole('button', { name: '保存', exact: true }).click();
  await expect(cardMark(page)).toHaveCount(1);
  await page.reload();
  await expect(cardMark(page)).toBeVisible();
  await expect(listMark(page)).toHaveCount(1);
  await page.evaluate(() => { location.hash = '#/'; });
  await expect(listMark(page)).toBeVisible();
});

test('ヘッダーの数が「触った 1 / 21」になる', async ({ page }) => {
  const viewport = await openDemo(page, 'toast');
  const summary = page.locator('[data-role="progress-summary"]');
  await expect(summary).toHaveText(`触った 0 / ${PATTERNS.length} ・ 名前を言えた 0 / ${PATTERNS.length}`);
  await viewport.getByRole('button', { name: '保存', exact: true }).click();
  await viewport.getByRole('button', { name: '保存', exact: true }).click();
  await expect(summary).toHaveText(`触った 1 / ${PATTERNS.length} ・ 名前を言えた 0 / ${PATTERNS.length}`);
  // Task 9 が記録する「名」も、次に開いたときに表示する。
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('uiz-progress-v1'));
    data.toast.named = true;
    data.toast.reversed = true;
    localStorage.setItem('uiz-progress-v1', JSON.stringify(data));
  });
  await page.reload();
  await expect(page.locator('.pattern-card [data-mark="named"] .visually-hidden')).toHaveText('名前を言えた');
  await expect(summary).toHaveText(`触った 1 / ${PATTERNS.length} ・ 名前を言えた 1 / ${PATTERNS.length}`);
  await expect(page.locator('[data-mark="reversed"]')).toHaveCount(0);
});

test('localStorage が使えなくても一覧とカードが動く', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('利用不可'); };
    Storage.prototype.setItem = () => { throw new Error('利用不可'); };
  });
  const viewport = await openDemo(page, 'toast');
  await viewport.getByRole('button', { name: '保存', exact: true }).click();
  await expect(cardMark(page)).toBeVisible();
  await page.evaluate(() => { location.hash = '#/'; });
  await expect(listMark(page)).toBeVisible();
  await page.locator('[data-pattern-id="toast"]').click();
  await expect(cardMark(page)).toBeVisible();
  await expect(page.locator('[data-role="viewport"] [data-demo]')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('最初に見本を押して印が付いても、見本の位置がずれない', async ({ page }) => {
  const view = await openDemo(page, 'toggle-switch');
  const before = await view.boundingBox();
  await view.dispatchEvent('pointerdown');
  await expect(page.locator('.pattern-card [data-mark="touched"]')).toHaveCount(1);
  const after = await view.boundingBox();
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
});
