import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

async function clickOutside(viewport) {
  const shade = viewport.locator('[data-menu-shade]');
  const target = await shade.isVisible() ? shade : viewport;
  const width = await target.evaluate(el => el.clientWidth);
  // ロケーターに任せてクリック位置までスクロールする。
  await target.click({ position: { x: width - 4, y: target === shade ? 4 : 80 } });
}

test('丁寧：開くと aria-expanded が true、Esc で閉じてボタンにフォーカスが戻る', async ({ page }) => {
  const view = await openDemo(page, 'hamburger-menu');
  const button = view.getByRole('button', { name: 'メニュー', exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(view.getByRole('link', { name: 'ホーム', exact: true })).toBeFocused();
  const panelId = await button.getAttribute('aria-controls');
  await expect(view.locator(`[id="${panelId}"]`)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
});

test('丁寧：幕を押すと閉じる／雑：Esc でも幕でも閉じない', async ({ page }) => {
  for (const quality of ['polished', 'rough']) {
    const view = await openDemo(page, 'hamburger-menu', { quality });
    const button = view.locator('[data-menu-toggle]');
    await button.click();
    if (quality === 'rough') await page.keyboard.press('Escape');
    await clickOutside(view);
    if (quality === 'rough') await expect(view.locator('[data-menu-panel]')).toBeVisible();
    else await expect(view.locator('[data-menu-panel]')).toBeHidden();
    if (quality === 'rough') {
      await button.click();
      await expect(view.locator('[data-menu-panel]')).toBeHidden();
    }
  }
});

test('丁寧：ボタンは44px四方以上／雑：44px未満', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const quality of ['polished', 'rough']) {
    const view = await openDemo(page, 'hamburger-menu', { quality });
    const box = await view.locator('[data-menu-toggle]').boundingBox();
    if (quality === 'polished') {
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      await view.locator('[data-menu-toggle]').click();
      await expect(view.locator('[data-menu-panel]')).toHaveCSS('width', '280px');
      await expect(view.locator('[data-menu-panel]')).toHaveCSS('animation-duration', '0.24s');
    } else {
      expect(box.width).toBe(28); expect(box.height).toBe(28);
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const view = await openDemo(page, 'hamburger-menu');
  await view.locator('[data-menu-toggle]').click();
  await expect(view.locator('[data-menu-panel]')).toHaveCSS('animation-name', 'none');
});

test('丁寧：項目を選ぶと見出しが変わり、メニューが閉じる', async ({ page }) => {
  const view = await openDemo(page, 'hamburger-menu');
  await view.locator('[data-menu-toggle]').click();
  await view.getByRole('link', { name: '検索', exact: true }).click();
  await expect(view.getByRole('heading')).toHaveText('検索');
  await expect(view.locator('[data-menu-panel]')).toBeHidden();
  await expect(view.locator('[data-menu-toggle]')).toBeFocused();
  await view.locator('[data-menu-toggle]').click();
  await expect(view.getByRole('link', { name: '検索', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(/#\/p\/hamburger-menu$/);
});
