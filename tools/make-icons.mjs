import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// テストと同じ手元の Chrome を使い、サーバーを起動せずに描画する。
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const directory = new URL('../site/icons/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.goto(new URL('./icon.html', import.meta.url).href);
  await page.evaluate(() => document.fonts.ready);
  for (const size of [180, 192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.locator('.icon').screenshot({
      path: fileURLToPath(new URL(`./icon-${size}.png`, directory)),
      type: 'png',
      animations: 'disabled',
    });
    console.log(`icon-${size}.png を書き出しました。`);
  }
} finally {
  await browser.close();
}
