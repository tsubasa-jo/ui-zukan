import { test, expect } from '@playwright/test';
import { PATTERNS } from '../../site/js/data/patterns.js';
import { openDemo } from './helpers.mjs';

for (const { id, nameJa, nameEn, frames } of PATTERNS) {
  for (const quality of ['rough', 'polished']) {
    test.describe(`${id}（${quality === 'rough' ? '雑' : '丁寧'}）`, () => {
      test('見本の文字に名前が出ない', async ({ page }) => {
        const viewport = await openDemo(page, id, { quality });
        const text = await viewport.innerText();
        expect(text).not.toContain(nameJa);
        expect(text.toLowerCase()).not.toContain(nameEn.toLowerCase());
      });

      test('見本の中のリンクを押しても hash が変わらない', async ({ page }) => {
        const viewport = await openDemo(page, id, { quality });
        const count = await viewport.locator('a[href]').count();
        for (let i = 0; i < count; i++) {
          // 移動で見本の内容が変わっても、各リンクを最初の状態から調べる。
          if (i > 0) await openDemo(page, id, { quality });
          // メニュー内の非表示リンクにもブラウザーの click を発火させる。
          await viewport.locator('a[href]').nth(i).evaluate(link => link.click());
          await expect(page).toHaveURL(new RegExp(`#/p/${id}$`));
          expect(await page.evaluate(() => location.hash)).toBe(`#/p/${id}`);
        }
      });

      test('切り替えと離脱でエラーも置き去りも出ない', async ({ page }) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/#/');
        await expect(page.locator('[data-role="pattern-list"]')).toBeVisible();
        const childrenBefore = await page.locator('body').evaluate(body => body.children.length);
        const viewport = await openDemo(page, id, { quality });
        const otherQuality = quality === 'rough' ? 'polished' : 'rough';
        for (let i = 0; i < 3; i++) {
          for (const value of [otherQuality, quality]) {
            await page.locator(`[data-quality-switch="${value}"]`).click();
            await expect(viewport.locator('[data-demo]')).toHaveCount(1);
          }
        }
        if (frames.length === 2) {
          for (const frame of [frames[1], frames[0]]) {
            await page.locator(`[data-frame-switch="${frame}"]`).click();
            await expect(viewport.locator('[data-demo]')).toHaveCount(1);
          }
        }
        await page.evaluate(() => { location.hash = '#/'; });
        await expect(page.locator('[data-role="viewport"]')).toHaveCount(0);
        await expect(page.locator('[data-demo]')).toHaveCount(0);
        await expect.poll(() => page.locator('body').evaluate(body => body.children.length)).toBe(childrenBefore);
        expect(errors).toEqual([]);
      });
    });
  }
}
