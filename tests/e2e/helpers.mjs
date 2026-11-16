import { expect } from '@playwright/test';

export async function openDemo(page, id, { quality = 'polished', frame } = {}) {
  await page.goto(`/#/p/${id}`);
  const viewport = page.locator('[data-role="viewport"]');
  await expect(viewport.locator('[data-demo]')).toHaveCount(1);
  const qualityButton = page.locator(`[data-quality-switch="${quality}"]`);
  await qualityButton.click();
  await expect(qualityButton).toHaveAttribute('aria-pressed', 'true');
  await expect(viewport.locator('[data-demo]')).toHaveCount(1);
  if (frame) {
    // 枠が1つだけの見本には切り替えボタンがない。
    const frameButton = page.locator(`[data-frame-switch="${frame}"]`);
    if (await page.locator('[data-frame-switch]').count()) {
      await frameButton.click();
      await expect(frameButton).toHaveAttribute('aria-pressed', 'true');
    }
    await expect(page.locator('.demo-frame')).toHaveClass(new RegExp(`\\bframe-${frame}\\b`));
    await expect(viewport.locator('[data-demo]')).toHaveCount(1);
  }
  return viewport;
}
