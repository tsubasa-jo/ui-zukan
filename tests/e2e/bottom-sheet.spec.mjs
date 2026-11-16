import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.mjs';

async function drag(page, view, distance, duration = 600) {
  const grabber = view.locator('[data-grabber]');
  await grabber.scrollIntoViewIfNeeded();
  const box = await grabber.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  for (let step = 1; step <= 10; step++) {
    await page.clock.runFor(duration / 10);
    await page.mouse.move(x, y + distance * step / 10);
  }
  await page.mouse.up();
  await page.clock.runFor(350);
}
test('丁寧：つまみを150px上に引くと data-detent が large になる', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'マウスのドラッグはmacで検査する');
  const time = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  const view = await openDemo(page, 'bottom-sheet');
  await view.getByRole('button', { name: '共有', exact: true }).click();
  await page.clock.runFor(350);
  await expect(view.locator('[data-sheet]')).toBeFocused();
  await drag(page, view, -150);
  await expect(view.locator('[data-sheet]')).toHaveAttribute('data-detent', 'large');
  await drag(page, view, 150);
  await expect(view.locator('[data-sheet]')).toHaveAttribute('data-detent', 'medium');
});
test('丁寧：つまみを150px下に引くと閉じる／40px下では中に戻る', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'マウスのドラッグはmacで検査する');
  const time = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  const view = await openDemo(page, 'bottom-sheet');
  const share = view.getByRole('button', { name: '共有', exact: true });
  await share.click(); await page.clock.runFor(350);
  await drag(page, view, 40);
  await expect(view.locator('[data-sheet]')).toBeVisible();
  await expect(view.locator('[data-sheet]')).toHaveAttribute('data-detent', 'medium');
  await drag(page, view, 150);
  await expect(view.locator('[data-sheet]')).toBeHidden();
  await expect(share).toBeFocused();
  await share.click(); await page.clock.runFor(350);
  await drag(page, view, 40, 40);
  await expect(view.locator('[data-sheet]')).toBeHidden();
});
test('丁寧：幕を押すと閉じる／雑：幕では閉じない', async ({ page }) => {
  for (const quality of ['polished', 'rough']) {
    const view = await openDemo(page, 'bottom-sheet', { quality });
    await view.getByRole('button', { name: '共有', exact: true }).click();
    await view.locator('[data-sheet-shade]').click({ position: { x: 8, y: 8 } });
    if (quality === 'polished') {
      await expect(view.locator('[data-sheet]')).toBeHidden();
      await view.getByRole('button', { name: '共有', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(view.locator('[data-sheet]')).toBeHidden();
    } else await expect(view.locator('[data-sheet]')).toBeVisible();
  }
});
test('雑：つまみを引いても高さが変わらない', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'マウスのドラッグはmacで検査する');
  const time = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  const view = await openDemo(page, 'bottom-sheet', { quality: 'rough' });
  await view.getByRole('button', { name: '共有', exact: true }).click();
  const before = await view.locator('[data-sheet]').boundingBox();
  await drag(page, view, -150);
  expect((await view.locator('[data-sheet]').boundingBox()).height).toBe(before.height);
});
