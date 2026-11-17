import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('丁寧：label が select に結び付いていて、選ぶと「お届け先：神奈川県」と出る', async ({ page }) => {
  const view = await openDemo(page, 'dropdown');
  const select = view.getByLabel('都道府県', { exact: true });
  await expect(select).toHaveJSProperty('tagName', 'SELECT');
  await expect(select.locator('option')).toHaveCount(48);
  await select.selectOption({ label: '神奈川県' });
  await expect(view.locator('[data-destination]')).toHaveText('お届け先：神奈川県');
});
test('雑：マウスを乗せると開き、離すと閉じる', async ({ page }) => {
  const view = await openDemo(page, 'dropdown', { quality: 'rough' });
  const trigger = view.locator('[data-picker]');
  const list = view.locator('[data-candidates]');
  await expect(list).toBeHidden();
  // iPhoneプロジェクトでも、比較対象のマウス操作を行う。
  await trigger.hover();
  await expect(list).toBeVisible();
  await expect(list.locator('[data-prefecture]')).toHaveCount(47);
  expect(await list.evaluate(el => el.getBoundingClientRect().bottom > el.closest('[data-role="viewport"]').getBoundingClientRect().bottom)).toBe(true);
  await view.locator('h2').hover();
  await expect(list).toBeHidden();
});
test('雑：Tab で届かない', async ({ page }) => {
  const view = await openDemo(page, 'dropdown', { quality: 'rough' });
  const trigger = view.locator('[data-picker]');
  await expect(trigger).toHaveJSProperty('tabIndex', -1);
  await expect(view.locator('select, input, button, a[href], [tabindex="0"]')).toHaveCount(0);
  await page.locator('[data-quality-switch="rough"]').focus();
  await page.keyboard.press('Tab');
  expect(await view.evaluate(el => el.contains(document.activeElement))).toBe(false);
});
