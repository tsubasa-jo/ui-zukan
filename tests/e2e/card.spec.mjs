import { test, expect } from '@playwright/test';
import { CATEGORIES } from '../../site/js/data/categories.js';
import { PATTERNS } from '../../site/js/data/patterns.js';

const detailed = PATTERNS.find(p => p.id === 'toast').prompts.detailed;

test('収録した見本が分類ごとに並ぶ', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('[data-pattern-id]')).toHaveCount(PATTERNS.length);
  await expect(page.getByRole('heading', { name: '待ち・お知らせ', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '表示・重ねる', exact: true })).toBeVisible();
  const ordered = CATEGORIES.flatMap(category => PATTERNS.filter(pattern => pattern.category === category.id));
  await expect(page.locator('[data-pattern-id]')).toContainText(ordered.map(pattern => pattern.nameJa));
  for (const link of await page.locator('[data-pattern-id]').all()) {
    await expect(link).toHaveAttribute('href', `#/p/${await link.getAttribute('data-pattern-id')}`);
    const id = await link.getAttribute('data-pattern-id');
    const pattern = PATTERNS.find(item => item.id === id);
    await expect(link.locator('.video-badge')).toHaveCount(pattern.fromVideo ? 1 : 0);
  }
});
test('項目を押すとカードが開き、名前と頼み方が出る', async ({ page }) => {
  await page.goto('/#/');
  await page.locator('[data-pattern-id="toast"]').click();
  await expect(page).toHaveURL(/#\/p\/toast$/);
  await expect(page.getByRole('heading', { name: 'トースト', exact: true, level: 1 })).toBeVisible();
  await expect(page.locator('[data-role="card-panel"]')).toContainText('Toast');
  await expect(page.locator('[data-role="card-panel"]')).toContainText('スナックバー（取り消しボタン付きの近い部品）');
  await expect(page.locator('[data-copy]')).toHaveCount(3);
  await expect(page.locator('[data-role="demo-slot"]')).toHaveCount(1);
  const headings = await page.locator('[data-role="card-panel"] h2').allTextContents();
  expect(headings).toEqual(['ひとことで言うと', 'こだわりポイント', '向いている場面', '向かない場面', 'AIへの頼み方']);
});
test('存在しない id は一覧に戻る', async ({ page }) => {
  await page.goto('/#/p/nope');
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('[data-pattern-id]')).toHaveCount(PATTERNS.length);
  await expect(page.locator('[data-copy]')).toHaveCount(0);
});
test('コピーすると「コピーしました」が出る', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#/p/toast');
  await page.locator('[data-copy="detailed"]').click();
  await expect(page.getByRole('status').filter({ hasText: 'コピーしました' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(detailed);
});
test('clipboard がないときも代わりの方法でコピーか案内が出る', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await page.goto('/#/p/toast');
  await page.locator('[data-copy="detailed"]').click();
  await expect(page.locator('[data-role="prompt-detailed"] [role="status"]')).toHaveText(/^(コピーしました|長押しでコピーしてください)$/);
});
test('mac では2列、iphone では1列', async ({ page }, testInfo) => {
  await page.goto('/#/p/toast');
  const list = await page.locator('[data-role="pattern-list"]').boundingBox();
  const card = await page.locator('[data-role="card-panel"]').boundingBox();
  if (testInfo.project.name === 'mac') {
    expect(card.x).toBeGreaterThanOrEqual(list.x + list.width);
    await expect(page.getByRole('link', { name: '一覧へ戻る', exact: true })).toBeHidden();
  } else {
    expect(list).toBeNull();
    expect(card).not.toBeNull();
    await expect(page.getByRole('link', { name: '一覧へ戻る', exact: true })).toBeVisible();
  }
});
test('コピー手段がすべて失敗したら対象文を選択して案内し、2秒後に案内を消す', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied'); } }, configurable: true });
    document.execCommand = () => false;
  });
  await page.clock.install();
  await page.goto('/#/p/toast');
  await page.locator('[data-copy="detailed"]').click();
  const status = page.locator('[data-role="prompt-detailed"] [role="status"]');
  await expect(status).toHaveText('長押しでコピーしてください');
  expect(await page.evaluate(() => window.getSelection().toString())).toBe(detailed);
  await page.clock.runFor(2100);
  await expect(status).toBeEmpty();
});
test('copyText は3つの結果を返す', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  expect(await page.evaluate(async () => {
    const { copyText } = await import('/js/clipboard.js');
    return copyText('コピーする文章');
  })).toBe('clipboard');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  // execCommand を呼べるよう、ユーザー操作の中で実行する。
  await page.evaluate(() => {
    const button = document.createElement('button');
    button.id = 'fallback-test';
    button.textContent = 'コピーの検査';
    button.onclick = async () => {
      const { copyText } = await import('/js/clipboard.js');
      button.dataset.result = await copyText('代わりの方法でコピー');
    };
    document.body.append(button);
  });
  await page.locator('#fallback-test').click();
  await expect(page.locator('#fallback-test')).toHaveAttribute('data-result', 'fallback');
  await page.evaluate(() => { document.execCommand = () => { throw new Error('unavailable'); }; });
  expect(await page.evaluate(async () => (await import('/js/clipboard.js')).copyText('手動でコピーする文章'))).toBe('manual');
  expect(await page.locator('[data-role="manual-copy"]').inputValue()).toBe('手動でコピーする文章');
  expect(await page.locator('[data-role="manual-copy"]').evaluate(el => el.selectionEnd - el.selectionStart)).toBe('手動でコピーする文章'.length);
});
test('戻る・進むでカードと一覧を切り替えられる', async ({ page }) => {
  await page.goto('/#/');
  await page.locator('[data-pattern-id="toast"]').click();
  await expect(page.locator('h1')).toHaveText('トースト');
  await page.goBack();
  await expect(page.locator('[data-copy]')).toHaveCount(0);
  await page.goForward();
  await expect(page.locator('h1')).toHaveText('トースト');
});
test('コピー待機中にカードを離れたら古い手動コピー欄を出さない', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: () => {
        window.__pendingCopy = new Promise((resolve, reject) => { window.__rejectCopy = reject; });
        return window.__pendingCopy;
      },
    } });
    document.execCommand = () => false;
  });
  await page.goto('/#/p/toast');
  await page.locator('[data-copy="detailed"]').click();
  await page.evaluate(() => { location.hash = "#/"; });
  await page.locator('[data-pattern-id="modal"]').click();
  await expect(page.locator('h1')).toHaveText('モーダル');
  await page.evaluate(async () => {
    window.__rejectCopy(new Error('denied'));
    await window.__pendingCopy.catch(() => {});
  });
  await expect(page.locator('[data-role="manual-copy"]')).toHaveCount(0);
  await expect(page.locator('[data-role="card-panel"] [role="status"]')).toHaveText(['', '', '']);
});

test('iphone ではカードを開くと一覧を隠す', async ({ page }) => {
  for (const width of [375, 390, 899, 900]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/#/');
    const list = page.locator('[data-role="pattern-list"]');
    const panel = page.locator('[data-role="card-panel"]');
    await expect(list).toBeVisible();
    if (width < 900) await expect(panel).toBeHidden();
    await page.locator('[data-pattern-id="toast"]').click();
    await expect(panel).toBeVisible();
    if (width < 900) {
      await expect(list).toBeHidden();
      await page.getByRole('link', { name: '一覧へ戻る', exact: true }).click();
      await expect(list).toBeVisible();
      await expect(panel).toBeHidden();
    } else await expect(list).toBeVisible();
  }
});
