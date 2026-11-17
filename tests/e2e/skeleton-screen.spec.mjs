import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  const time = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
});

test('丁寧：読み込み中は data-skeleton があり aria-busy="true"、2.1秒後に中身と false', async ({ page }) => {
  const view = await openDemo(page, 'skeleton-screen');
  const list = view.locator('[data-articles]');
  await expect(view.locator('[data-skeleton]')).toHaveCount(4);
  await expect(list).toHaveAttribute('aria-busy', 'true');
  await page.clock.runFor(1999);
  await expect(view.locator('[data-skeleton]')).toHaveCount(4);
  await page.clock.runFor(101);
  await expect(list).toHaveAttribute('aria-busy', 'false');
  await expect(view.locator('[data-skeleton]')).toHaveCount(0);
  await expect(view.locator('article h3')).toHaveCount(4);
  await view.getByRole('button', { name: 'もう一度読み込む' }).click();
  await expect(list).toHaveAttribute('aria-busy', 'true');
  await page.clock.runFor(2100);
  await expect(list).toHaveAttribute('aria-busy', 'false');
});

test('丁寧：読み込みの前後で、各行の高さの差が1px以内', async ({ page }) => {
  for (const frame of ['phone', 'pc']) {
    const view = await openDemo(page, 'skeleton-screen', { frame });
    const boxes = () => view.locator('[data-article]').evaluateAll(rows => rows.map(row => {
      const { height, top } = row.getBoundingClientRect(); return { height, top };
    }));
    const before = await boxes();
    const buttonBefore = await view.getByRole('button').boundingBox();
    await page.clock.runFor(2100);
    const after = await boxes();
    expect(before).toHaveLength(4); expect(after).toHaveLength(4);
    after.forEach((box, index) => {
      expect(Math.abs(box.height - before[index].height)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.top - before[index].top)).toBeLessThanOrEqual(1);
    });
    expect(Math.abs((await view.getByRole('button').boundingBox()).y - buttonBefore.y)).toBeLessThanOrEqual(1);
  }
});

test('雑：読み込み中に data-skeleton が無い', async ({ page }) => {
  const view = await openDemo(page, 'skeleton-screen', { quality: 'rough' });
  await expect(view.getByText('読み込み中…')).toBeVisible();
  await expect(view.locator('[data-skeleton], [aria-busy]')).toHaveCount(0);
  const before = await view.getByRole('button').boundingBox();
  await page.clock.runFor(2100);
  await expect(view.locator('article')).toHaveCount(4);
  expect((await view.getByRole('button').boundingBox()).y).toBeGreaterThan(before.y);
});

test('reduced-motion では光の動きを止める', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const view = await openDemo(page, 'skeleton-screen');
  await expect(view.locator('[data-skeleton]')).toHaveCount(4);
  for (const box of await view.locator('[data-skeleton] [data-image]').all()) {
    await expect(box).toHaveCSS('animation-name', 'none');
  }
});

test('読み込み直しは最後の操作から2秒待ち、離脱後は要素を残さない', async ({ page }) => {
  const view = await openDemo(page, 'skeleton-screen');
  await page.clock.runFor(1000);
  await view.getByRole('button').click();
  await page.clock.runFor(1100);
  await expect(view.locator('[data-skeleton]')).toHaveCount(4);
  await page.clock.runFor(900);
  await expect(view.locator('article h3')).toHaveCount(4);
  await view.getByRole('button').click();
  await page.evaluate(() => { location.hash = '#/'; });
  await expect(page.locator('[data-demo]')).toHaveCount(0);
  await page.clock.runFor(3000);
  await expect(page.locator('[data-demo]')).toHaveCount(0);
});
