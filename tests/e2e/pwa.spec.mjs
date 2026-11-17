import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'mac', 'Service Worker は mac で検査する');
});

test('マニフェストが読め、name が「さわれるUI図鑑」', async ({ page }) => {
  await page.goto('./');
  const manifest = await page.locator('link[rel="manifest"]').evaluate(async link => {
    const response = await fetch(link.href);
    if (!response.ok) throw new Error('マニフェストを読めません');
    return response.json();
  });
  expect(manifest.name).toBe('さわれるUI図鑑');
  expect(manifest.start_url).toBe('./');
  expect(manifest.scope).toBe('./');
  expect(manifest.display).toBe('standalone');
});

test('一度開いたあと通信を切っても、まだ開いていないカードの見本まで動く', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise(resolve => {
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
    });
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-role="pattern-list"]')).toBeVisible();
  await page.locator('[data-pattern-id="drag-reorder"]').click();
  const demo = page.locator('[data-demo="drag-reorder"]');
  await expect(demo).toBeVisible();
  const handle = demo.getByRole('button', { name: '牛乳を並べ替える' });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(demo.locator('[data-item]').first()).toHaveAttribute('data-item', '卵');
  await expect(demo.locator('[aria-live="polite"]')).toHaveText('牛乳を2番目に移動しました');
  expect(errors).toEqual([]);
});
