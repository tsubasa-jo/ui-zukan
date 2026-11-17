import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';
const opener = view => view.getByRole('button', { name: '旅行の写真を削除' });

test('丁寧：開くと「キャンセル」にフォーカスがあり、role="alertdialog"', async ({ page }) => {
  const view = await openDemo(page, 'confirm-dialog');
  await opener(view).click();
  const dialog = view.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeFocused();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog).toHaveAccessibleName('『旅行の写真』を削除しますか？');
  await expect(dialog).toHaveAccessibleDescription('削除すると元に戻せません。');
  for (const attribute of ['aria-labelledby', 'aria-describedby']) {
    const id = await dialog.getAttribute(attribute);
    expect(id).toBeTruthy(); await expect(view.locator(`[id="${id}"]`)).toBeVisible();
  }
});

test('丁寧：Esc で閉じ、写真は残る', async ({ page }) => {
  const view = await openDemo(page, 'confirm-dialog');
  await opener(view).click(); await page.keyboard.press('Escape');
  await expect(view.locator('[data-confirm]')).toHaveCount(0);
  await expect(view.locator('[data-photo="travel"]')).toBeVisible();
  await expect(opener(view)).toBeFocused();
});

test('丁寧：ボタンの文字が「削除」で「OK」が無い／雑：「OK」がある', async ({ page }) => {
  let view = await openDemo(page, 'confirm-dialog');
  await opener(view).click();
  await expect(view.getByRole('alertdialog').getByRole('button', { name: '削除', exact: true })).toBeVisible();
  await expect(view.getByRole('button', { name: 'OK', exact: true })).toHaveCount(0);
  await view.getByRole('alertdialog').getByRole('button', { name: 'キャンセル' }).click();
  view = await openDemo(page, 'confirm-dialog', { quality: 'rough' });
  await opener(view).click();
  await expect(view.locator('[data-confirm]').getByRole('button', { name: 'OK', exact: true })).toBeVisible();
  await expect(view.locator('[data-confirm] h3')).toHaveText('よろしいですか？');
});

test('雑：開くと「OK」にフォーカスがある', async ({ page }) => {
  const view = await openDemo(page, 'confirm-dialog', { quality: 'rough' });
  await opener(view).click();
  await expect(view.getByRole('button', { name: 'OK', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(view.locator('[data-confirm]')).toBeVisible();
  await expect(view.getByRole('alertdialog')).toHaveCount(0);
});

test('丁寧：Tabを繰り返しても外に出ず、閉じると開いたボタンへ戻る', async ({ page }) => {
  const view = await openDemo(page, 'confirm-dialog');
  await opener(view).click();
  const dialog = view.getByRole('alertdialog');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 3 ? 'Tab' : 'Shift+Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.locator('[data-quality-switch="polished"]').focus();
  await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeFocused();
  await dialog.getByRole('button', { name: 'キャンセル' }).click();
  await expect(opener(view)).toBeFocused();
  await expect(view.locator('[data-photo="travel"]')).toBeVisible();
});

test('丁寧：削除を確定すると対象の写真だけ消え、開いたボタンへ戻る', async ({ page }) => {
  const view = await openDemo(page, 'confirm-dialog');
  await opener(view).click();
  await view.getByRole('alertdialog').getByRole('button', { name: '削除', exact: true }).click();
  await expect(view.locator('[data-photo="travel"]')).toHaveCount(0);
  await expect(view.locator('[data-photo]')).toHaveCount(2);
  await expect(view.locator('[data-confirm]')).toHaveCount(0);
  await expect(opener(view)).toBeFocused();
  await expect(opener(view)).toBeDisabled();
});

test('開いたまま離脱すると画面とフォーカスの制御を残さない', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const view = await openDemo(page, 'confirm-dialog');
  await opener(view).click();
  await page.evaluate(() => { location.hash = '#/'; });
  await expect(page.locator('[data-demo], [data-confirm]')).toHaveCount(0);
  const next = page.locator('[data-pattern-id="toast"]');
  await next.focus(); await expect(next).toBeFocused();
  await next.click();
  await expect(page.locator('[data-demo="toast"]')).toBeVisible();
  expect(errors).toEqual([]);
});
