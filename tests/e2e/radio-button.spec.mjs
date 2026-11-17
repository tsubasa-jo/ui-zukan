import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('丁寧：文字を押すと選ばれる／雑：文字を押しても選ばれない', async ({ page }) => {
  for (const quality of ['polished', 'rough']) {
    const view = await openDemo(page, 'radio-button', { quality });
    await view.getByText('お急ぎ', { exact: true }).click();
    const input = view.locator('input[value="express"]');
    if (quality === 'polished') await expect(input).toBeChecked();
    else {
      await expect(view.locator('input:checked')).toHaveCount(0);
      await input.click(); await expect(input).toBeChecked();
      const box = await input.boundingBox();
      expect(box.width).toBe(12); expect(box.height).toBe(12);
      await view.locator('input[value="pickup"]').click();
      await expect(input).not.toBeChecked();
    }
  }
});
test('丁寧：legend「配送方法」があり、最初は「通常」が選ばれている', async ({ page }) => {
  const view = await openDemo(page, 'radio-button');
  await expect(view.locator('fieldset legend')).toHaveText('配送方法');
  await expect(view.getByRole('radio', { name: '通常', exact: true })).toBeChecked();
  await expect(view.locator('input:checked')).toHaveCount(1);
});
test('丁寧：各行の高さが44px以上', async ({ page }) => {
  const view = await openDemo(page, 'radio-button', { frame: 'phone' });
  await expect(view.locator('label')).toHaveCount(3);
  for (const row of await view.locator('label').all()) expect((await row.boundingBox()).height).toBeGreaterThanOrEqual(44);
});
