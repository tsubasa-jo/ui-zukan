import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:8080', channel: 'chrome' }, // 手元の Google Chrome を使う（ブラウザをダウンロードしない）
  projects: [
    { name: 'mac', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } } },
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium', channel: 'chrome', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: { command: 'npm run serve', url: 'http://localhost:8080', reuseExistingServer: false },
});
