import { test, expect } from '@playwright/test';
import { PATTERNS } from '../../site/js/data/patterns.js';
import { pickRound } from '../../site/js/quiz.js';
import { createProgressStore } from '../../site/js/progress.js';

const values = [0.13, 0.87, 0.42, 0.65, 0.02];
function sequence() {
  let index = 0;
  return () => values[index++ % values.length];
}
const round = pickRound(PATTERNS, createProgressStore(null), sequence());
const choices = page => page.locator('[data-role="quiz-choices"] button');
const header = page => page.getByRole('navigation', { name: '画面の切り替え' });

async function openQuiz(page) {
  await page.goto('/#/quiz');
  await expect(page.locator('[data-role="quiz-counter"]')).toHaveText('1 / 5');
  await expect(page.locator('[data-role="viewport"] [data-demo]')).toHaveCount(1);
}
async function answer(page, pattern) {
  await page.locator('[data-role="quiz-choices"]').getByRole('button', {
    name: `${pattern.nameJa} ${pattern.nameEn}`, exact: true,
  }).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ randomValues, ids }) => {
    let index = 0;
    Math.random = () => randomValues[index++ % randomValues.length];
    // about:blank では保存領域を読めないので、サイトのページだけで記録を整える。
    if (location.protocol === 'about:') return;
    localStorage.removeItem('uiz-progress-v1');
    const onlyUnnamed = new URLSearchParams(location.search).get('quiz-answer');
    if (onlyUnnamed) localStorage.setItem('uiz-progress-v1', JSON.stringify(
      Object.fromEntries(ids.filter(id => id !== onlyUnnamed).map(id => [id, { named: true }])),
    ));
  }, { randomValues: values, ids: PATTERNS.map(pattern => pattern.id) });
});

test('ヘッダーの「クイズ」で #/quiz が開き、「1 / 5」と選択肢4つが出る', async ({ page }) => {
  await page.goto('/#/');
  await header(page).getByRole('link', { name: 'クイズ', exact: true }).click();
  await expect(page).toHaveURL(/#\/quiz$/);
  await expect(header(page).getByRole('link', { name: 'クイズ', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(header(page).getByRole('link', { name: '図鑑', exact: true })).not.toHaveAttribute('aria-current');
  await expect(page.locator('[data-role="pattern-list"]')).toBeHidden();
  await expect(page.locator('[data-role="quiz-counter"]')).toHaveText('1 / 5');
  await expect(choices(page)).toHaveCount(4);
  await expect(page.locator('[data-role="viewport"] [data-demo]')).toHaveCount(1);
  // 一覧や見本、読み上げ用の文言から答えが漏れないことも調べる。
  const names = [round[0].nameJa, round[0].nameEn, ...round[0].aliases];
  const outsideChoices = await page.locator('body').evaluate(body => {
    const clone = body.cloneNode(true);
    clone.querySelector('[data-role="pattern-list"]')?.remove();
    clone.querySelector('[data-role="quiz-choices"]')?.remove();
    clone.querySelectorAll('style, script').forEach(node => node.remove());
    return clone.textContent;
  });
  for (const name of names) expect(outsideChoices.toLowerCase()).not.toContain(name.toLowerCase());
  const accessibilityNames = await page.locator('[data-role="viewport"]').ariaSnapshot();
  for (const name of names) expect(accessibilityNames.toLowerCase()).not.toContain(name.toLowerCase());
});

test('問題の見本には雑・丁寧の切り替えが無い', async ({ page }) => {
  await openQuiz(page);
  await expect(page.locator('[data-quality-switch], [data-frame-switch], .demo-controls')).toHaveCount(0);
  await expect(page.locator('.demo-frame')).toHaveClass(new RegExp(`frame-${round[0].frames[0]}`));
  await expect(page.locator('[data-demo]')).toHaveAttribute('data-quality', 'polished');
  const viewport = page.locator('[data-role="viewport"]');
  const before = await viewport.boundingBox();
  await viewport.dispatchEvent('pointerdown');
  const after = await viewport.boundingBox();
  expect(after.y).toBe(before.y);
  expect(after.height).toBe(before.height);
  // 見本に元からある読み上げ名も、出題中は答えを明かさない。
  for (const id of ['breadcrumb', 'carousel']) {
    const pattern = PATTERNS.find(item => item.id === id);
    await page.goto(`/?quiz-answer=${id}#/quiz`);
    await expect(page.locator('[data-demo]')).toHaveAttribute('data-demo', id);
    const sample = page.locator('[data-role="viewport"]');
    const snapshot = await sample.ariaSnapshot();
    for (const name of [pattern.nameJa, pattern.nameEn, ...pattern.aliases]) {
      expect(snapshot.toLowerCase()).not.toContain(name.toLowerCase());
      expect((await sample.innerText()).toLowerCase()).not.toContain(name.toLowerCase());
    }
    if (id === 'breadcrumb') {
      await sample.getByRole('link').first().click();
      // 見本が内部のDOMを作り直した後にも名前を伏せる。
      expect(await sample.ariaSnapshot()).not.toContain(pattern.nameJa);
    }
  }
});

test('正解を選ぶと「正解」と出て、その動きに「名」の印が付く', async ({ page }) => {
  await openQuiz(page);
  await answer(page, round[0]);
  await expect(page.locator('[data-role="quiz-feedback"]')).toHaveText('正解');
  for (const button of await choices(page).all()) await expect(button).toBeDisabled();
  await expect(page.getByRole('button', { name: '次の問題', exact: true })).toBeVisible();
  await expect(page.locator('[data-role="progress-summary"]')).toContainText('名前を言えた 1 / 21');
  await header(page).getByRole('link', { name: '図鑑', exact: true }).click();
  await expect(header(page).getByRole('link', { name: '図鑑', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator(`[data-pattern-id="${round[0].id}"] [data-mark="named"]`)).toBeVisible();
  await page.locator(`[data-pattern-id="${round[0].id}"]`).click();
  await expect(page.locator('.pattern-card [data-mark="named"]')).toBeVisible();
});

test('間違えると「正解は」と出て、見本が2つ並ぶ', async ({ page }, testInfo) => {
  await openQuiz(page);
  const before = await page.locator('[data-role="viewport"]').evaluate(node => {
    const box = node.getBoundingClientRect();
    return { top: box.top + window.scrollY, width: box.width };
  });
  const wrong = choices(page).filter({ hasNotText: round[0].nameEn }).first();
  const chosenText = await wrong.innerText();
  await wrong.click();
  await expect(page.locator('[data-role="quiz-feedback"]')).toHaveText(`正解は${round[0].nameJa}`);
  const comparison = page.locator('[data-role="quiz-comparison"]');
  await expect(comparison.locator('[data-demo]')).toHaveCount(2);
  const items = comparison.locator('[data-comparison-item]');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText(round[0].nameJa);
  await expect(items.nth(1)).toContainText(chosenText.split('\n')[0]);
  for (const item of await items.all()) {
    await expect(item.getByRole('heading', { name: 'ひとことで言うと', exact: true })).toBeVisible();
    await expect(item.getByRole('link', { name: 'カードを見る', exact: true })).toHaveAttribute('href', /^#\/p\//);
  }
  const first = await items.nth(0).boundingBox();
  const second = await items.nth(1).boundingBox();
  if (testInfo.project.name === 'mac') {
    expect(second.x).toBeGreaterThanOrEqual(first.x + first.width);
    expect(second.y).toBe(first.y);
  } else {
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
    expect(second.x).toBe(first.x);
  }
  const after = await comparison.locator('[data-role="viewport"]').first().evaluate(node => {
    const box = node.getBoundingClientRect();
    return { top: box.top + window.scrollY, width: box.width };
  });
  expect(after.top).toBe(before.top);
  expect(after.width).toBe(before.width);
  await expect(page.locator('[data-role="progress-summary"]')).toContainText('名前を言えた 0 / 21');
  for (const button of await choices(page).all()) await expect(button).toBeDisabled();
  await page.getByRole('button', { name: '次の問題', exact: true }).click();
  await expect(page.locator('[data-demo]')).toHaveCount(1);
  await expect(page.locator('[data-role="quiz-comparison"]')).toHaveCount(0);
});

test('5問答えると「5問中」の結果が出て、「もう一度」で1問目に戻る', async ({ page }) => {
  await openQuiz(page);
  for (let index = 0; index < 5; index++) {
    await expect(page.locator('[data-role="quiz-counter"]')).toHaveText(`${index + 1} / 5`);
    if (index < 3) await answer(page, round[index]);
    else await choices(page).filter({ hasNotText: round[index].nameEn }).first().click();
    await page.getByRole('button', { name: '次の問題', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: '5問中3問正解', exact: true })).toBeVisible();
  await expect(page.locator('[data-demo]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '図鑑に戻る', exact: true })).toHaveAttribute('href', '#/');
  await page.getByRole('button', { name: 'もう一度', exact: true }).click();
  await expect(page.locator('[data-role="quiz-counter"]')).toHaveText('1 / 5');
  await expect(choices(page)).toHaveCount(4);
  await expect(page.locator('[data-demo]')).toHaveCount(1);
});

test('クイズの途中で図鑑に戻ると、見本が残らない', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openQuiz(page);
  for (const answered of [false, true]) {
    if (answered) await choices(page).filter({ hasNotText: round[0].nameEn }).first().click();
    await header(page).getByRole('link', { name: '図鑑', exact: true }).click();
    await expect(page.locator('[data-demo], [data-role="viewport"]')).toHaveCount(0);
    await expect(page.locator('[data-role="pattern-list"]')).toBeVisible();
    await header(page).getByRole('link', { name: 'クイズ', exact: true }).click();
    await expect(page.locator('[data-demo]')).toHaveCount(1);
  }
  // 実際にimportを保留し、新しい見本の読み込み中に離れる。
  await header(page).getByRole('link', { name: '図鑑', exact: true }).click();
  let releaseDemo;
  const held = new Promise(resolve => { releaseDemo = resolve; });
  let requestedDemo;
  const requested = new Promise(resolve => { requestedDemo = resolve; });
  await page.route('**/demos/*.js', async route => {
    requestedDemo();
    await held;
    await route.continue();
  });
  // 新しい文書にしてES moduleのキャッシュも消す。同じURLへの goto は読み込み直さないため、一度ページを離れる。
  await page.goto('about:blank');
  await page.goto('/#/');
  await header(page).getByRole('link', { name: 'クイズ', exact: true }).click();
  await requested;
  await header(page).getByRole('link', { name: '図鑑', exact: true }).click();
  const loaded = page.waitForResponse(response => response.url().includes('/demos/'));
  releaseDemo();
  await loaded;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('[data-demo], [data-role="viewport"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
