import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test('丁寧：最後の段はリンクでなく aria-current="page"／雑：最後の段もリンク', async ({ page }) => {
  const view = await openDemo(page, 'breadcrumb');
  const current = view.locator('nav [aria-current="page"]');
  await expect(current).toHaveText('商品詳細');
  expect(await current.evaluate(el => el.tagName)).not.toBe('A');
  await expect(view.locator('nav > ol > li')).toHaveCount(5);
  const rough = await openDemo(page, 'breadcrumb', { quality: 'rough' });
  await expect(rough.getByRole('link', { name: '商品詳細', exact: true })).toBeVisible();
});

test('丁寧：区切りの記号が文字として入っていない', async ({ page }) => {
  const view = await openDemo(page, 'breadcrumb');
  for (const text of await view.locator('nav li').allTextContents()) expect(text).not.toMatch(/[›>]/);
  await expect(view.getByRole('navigation', { name: 'パンくずリスト' })).toBeVisible();
});

test('丁寧・スマホ枠：「…」を押すと5段すべてが見える', async ({ page }) => {
  const view = await openDemo(page, 'breadcrumb', { frame: 'phone' });
  await expect(view.locator('nav li:visible')).toHaveCount(3);
  await view.getByRole('button', { name: '途中の階層を表示' }).click();
  await expect(view.locator('nav li:visible')).toHaveCount(5);
  await expect(view.locator('nav li')).toHaveText(['ホーム', '家電', 'キッチン家電', '電子レンジ', '商品詳細']);
});

test('上の段を押すと、見本の中がその段のページになる', async ({ page }) => {
  for (const quality of ['polished', 'rough']) {
    const view = await openDemo(page, 'breadcrumb', { quality, frame: 'pc' });
    await view.getByRole('link', { name: '家電', exact: true }).click();
    await expect(view.getByRole('heading')).toHaveText('家電');
    await expect(view.getByRole('link', { name: '電子レンジ', exact: true })).toHaveCount(0);
    if (quality === 'polished') await expect(view.locator('nav li')).toHaveCount(2);
    await expect(page).toHaveURL(/#\/p\/breadcrumb$/);
  }
});
