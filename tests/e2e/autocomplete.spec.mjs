import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('丁寧：「か」と打つと候補が6件以下で出て、一致部分が mark になる', async ({ page }) => {
  const time = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  const view = await openDemo(page, 'autocomplete');
  const input = view.getByRole('combobox');
  await input.fill('か');
  await page.clock.runFor(149);
  await expect(view.getByRole('listbox')).toBeHidden();
  await page.clock.runFor(1);
  const options = view.getByRole('option');
  expect(await options.count()).toBeGreaterThan(0);
  expect(await options.count()).toBeLessThanOrEqual(6);
  for (const name of ['神奈川県', '香川県', '鹿児島県']) await expect(options.filter({ hasText: name })).toBeVisible();
  for (const option of await options.all()) await expect(option.locator('mark').first()).toHaveText('か');
  await expect(input).toHaveAttribute('aria-controls', await view.getByRole('listbox').getAttribute('id'));
  // 途中の入力のタイマーを取り消し、最後の入力から150ms待つ。
  await input.fill('かな'); await page.clock.runFor(100);
  await input.fill('東京'); await page.clock.runFor(50);
  // 待っている間は前の「か」の候補が残り、一覧は消えない（ちらつかない）。
  await expect(options.filter({ hasText: '神奈川県' })).toBeVisible();
  await expect(options.filter({ hasText: '東京都' })).toHaveCount(0);
  await page.clock.runFor(100);
  await expect(options).toHaveCount(1);
  await expect(options.first().locator('mark')).toHaveText('東京');
});
test('丁寧：↓ で aria-activedescendant が動き、Enter で入力欄に入る', async ({ page }) => {
  const view = await openDemo(page, 'autocomplete');
  const input = view.getByRole('combobox');
  await input.fill('か');
  await expect(view.getByRole('option').first()).toBeVisible();
  await input.press('ArrowDown');
  const first = await input.getAttribute('aria-activedescendant');
  await expect(view.locator(`[id="${first}"]`)).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowDown');
  expect(await input.getAttribute('aria-activedescendant')).not.toBe(first);
  await input.press('ArrowUp');
  await expect(input).toHaveAttribute('aria-activedescendant', first);
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(input).toHaveValue('神奈川県');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
});
test('丁寧：Esc で候補が閉じ、aria-expanded が false になる', async ({ page }) => {
  const view = await openDemo(page, 'autocomplete');
  const input = view.getByRole('combobox');
  await input.fill('か');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await input.press('ArrowDown'); await input.press('Escape');
  await expect(view.getByRole('listbox')).toBeHidden();
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  await expect(input).toHaveValue('か');
  // 待機中の検索もEscで取り消せる。
  await input.fill('かな'); await input.press('Escape');
  await page.waitForTimeout(200);
  await expect(input).toHaveAttribute('aria-expanded', 'false');
});
test('丁寧：変換中の Enter では候補を選ばない', async ({ page }) => {
  const view = await openDemo(page, 'autocomplete');
  const input = view.getByRole('combobox');
  await input.fill('か');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await input.press('ArrowDown');
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  await expect(input).toHaveValue('か');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(view.getByRole('listbox')).toBeVisible();
});
test('丁寧：一致しないと「該当する都道府県がありません」', async ({ page }) => {
  const view = await openDemo(page, 'autocomplete');
  const input = view.getByRole('combobox');
  await input.fill('該当なし');
  await expect(view.getByRole('status')).toHaveText('該当する都道府県がありません');
  await expect(view.getByRole('option')).toHaveCount(0);
  await expect(input).toHaveAttribute('aria-expanded', 'false');
});
test('雑：↓ を押しても aria-activedescendant が付かない', async ({ page }) => {
  const view = await openDemo(page, 'autocomplete', { quality: 'rough' });
  const input = view.locator('input');
  await input.fill('か');
  expect(await view.locator('li').count()).toBeGreaterThan(6);
  await input.press('ArrowDown');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  await expect(view.locator('mark, [role="combobox"], [role="listbox"]')).toHaveCount(0);
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  await expect(input).toHaveValue('神奈川県');
  await input.fill('該当なし');
  await expect(view.locator('li')).toHaveCount(0);
  await expect(view.getByText('該当する都道府県がありません')).toHaveCount(0);
});

test('丁寧：候補を押して選べる／外側を押すと閉じる', async ({ page }) => {
  const view = await openDemo(page, 'autocomplete', { frame: 'phone' });
  const input = view.getByRole('combobox');
  await input.fill('かな');
  await view.getByRole('option').filter({ hasText: '神奈川県' }).click();
  await expect(input).toHaveValue('神奈川県');
  await expect(input).toBeFocused();
  await input.fill('か');
  await expect(view.getByRole('listbox')).toBeVisible();
  await view.locator('h2').click();
  await expect(input).toHaveAttribute('aria-expanded', 'false');
});
