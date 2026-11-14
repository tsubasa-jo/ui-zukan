# さわれるUI図鑑 段階1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> このプロジェクトでは、各タスクの実作業は Codex（`/codex:rescue`）に渡し、Claude が差分とテストで確かめる。

**Goal:** 図鑑の骨組み（一覧、カード、スマホ枠とPC枠、雑・丁寧の切り替え、頼み方のコピー）と、トースト・モーダル・プルトゥリフレッシュの3つの見本を作り、iPhoneとMacで触れる状態にする。

**Architecture:** ビルドなしの静的サイト。`site/` 以下が公開されるファイルのすべてで、ES モジュールで分割する。カードの文章は `site/js/data/patterns.js` に、見本は `site/demos/<id>.js` に1つずつ置き、どの見本も同じ `mount()` の形で枠の中に組み込まれる。

**Tech Stack:** HTML / CSS / JavaScript（ES2022、外部ライブラリなし）。テストだけ Node の組み込みテスト（`node --test`）と Playwright 1.65（chromium。手元に入っている）を使う。

**Spec:** `docs/2026-11-14-ui-patterns-app-design.md`

## 範囲

この計画は設計書第8節の**段階1だけ**を扱う。段階1のあとで本人に触ってもらい、見直しを反映してから段階2・3の計画を別に書く。GitHub Pages への公開、ホーム画面用のマニフェストと Service Worker、クイズ、覚えた印は段階1に入れない。

## Global Constraints

- 外部のライブラリ、CDN、ビルドの仕組みを `site/` で使わない。テスト用の devDependencies（`@playwright/test`）だけ許す
- 外部サービスへの送信・計測をしない
- 画面の文言は日本語。英語名は各カードに併記する
- 対象：iPhoneのSafari、MacのSafariとChrome。タッチとマウスの両方で操作できる（Pointer Events を使う）
- 見本の枠の中では、ページ全体のスクロール・更新・戻る操作を起こさない（`overscroll-behavior: contain`、ジェスチャーを受ける要素に `touch-action: none`）
- `prefers-reduced-motion: reduce` のときはアニメーションを控えめにする
- 「丁寧」の基準：スマホ枠は Apple のヒューマンインターフェイスガイドライン、PC枠は Web で広く使われている作法（WAI-ARIA の作り方の手引き）
- コミット・プッシュ・公開は、実行前にユーザーの了承を得る（このフォルダはまだ git 管理されていない）

## Review Focus

テストが直接は狙っていないが、本人が触ったときに起きやすい問題。下の各行のテストを、担当するタスクに入れてある。

1. **iPhoneでLAN経由で開くと `navigator.clipboard` がない**（http は安全な接続とみなされない）→ コピーは代わりの方法で成功するか、本文を選択状態にして「長押しでコピー」と案内する（Task 3）
2. **見本の途中で切り替える**（トーストの表示中やプルトゥリフレッシュの更新中に、雑・丁寧、枠、カードを切り替える）→ 古い見本のタイマーやリスナーが残らず、消えたはずのトーストが出てこない（Task 4、5、7）
3. **トーストのボタンを素早く何度も押す** → 丁寧版は1つだけ表示されて入れ替わる。雑版は積み重なる（Task 5）
4. **モーダルを開いたままブラウザの「戻る」やほかのカードに移る** → モーダルは閉じ、背景のスクロール固定も解ける（Task 6）
5. **幅375pxのiPhoneでスマホ枠を表示する** → 枠が画面からはみ出さず、横スクロールが起きない（Task 4）

---

## ファイル構成

```
AI-training/
├── package.json                 テストの実行コマンドと devDependencies
├── playwright.config.mjs        site/ を配信して e2e を走らせる設定
├── site/                        公開されるファイル（ここだけを GitHub Pages に置く予定）
│   ├── index.html               画面の骨組み
│   ├── css/base.css             色・文字・余白の変数、ライト/ダーク
│   ├── css/app.css              一覧とカードの配置（1列 / 2列）
│   ├── css/frame.css            スマホ枠・PC枠
│   ├── js/app.js                起動、ハッシュでの画面切り替え、一覧の描画
│   ├── js/card.js               カード1枚の描画
│   ├── js/frame.js              枠の生成と見本の組み込み・取り外し
│   ├── js/clipboard.js          コピー（代わりの方法つき）
│   ├── js/data/categories.js    分類の一覧
│   ├── js/data/patterns.js      カードの文章（段階1は3件）
│   └── demos/toast.js, modal.js, pull-to-refresh.js
└── tests/
    ├── unit/patterns.test.mjs   データの形の検査
    └── e2e/*.spec.mjs           画面の動作確認
```

## 共通の形（全タスクが使う）

**分類**（`site/js/data/categories.js`）

```js
export const CATEGORIES = [
  { id: 'navigation', name: 'ナビゲーション' },
  { id: 'overlay',    name: '表示・重ねる' },
  { id: 'input',      name: '入力' },
  { id: 'data',       name: '一覧・データ' },
  { id: 'feedback',   name: '待ち・お知らせ' },
  { id: 'gesture',    name: '指で操作する' },
  { id: 'layout',     name: '画面の組み方' },
  { id: 'utility',    name: '操作・便利機能' },
  { id: 'motion',     name: '動き・演出' },
  { id: 'guide',      name: '案内' },
];
```

**カードのデータ**（`site/js/data/patterns.js` の `export const PATTERNS = [...]` の1件）

| キー | 型 | 内容 |
|---|---|---|
| `id` | string | 英小文字とハイフン。`site/demos/<id>.js` と一致 |
| `category` | string | `CATEGORIES` の id |
| `nameJa` / `nameEn` | string | 日本語名 / 英語名 |
| `aliases` | string[] | 別名（空でもよい） |
| `summary` | string | 1〜2文 |
| `goodFor` | string[] | 向いている場面（1件以上） |
| `badFor` | `{ case: string, instead: string }[]` | 向かない場面と代わり（1件以上） |
| `frames` | `('phone'｜'pc')[]` | 使える枠。先頭が最初に表示される枠 |
| `points` | `{ title: string, detail: string }[]` | こだわりポイント（2〜4件） |
| `prompts` | `{ short, detailed, swiftui }`（すべて string） | AIへの頼み方 3段階 |
| `fromVideo` | boolean | 動画で紹介されたもの |
| `phase` | 1 ｜ 2 ｜ 3 | 作る段階 |

**見本の形**（`site/demos/<id>.js`）

```js
// viewport: 枠の中の表示領域（HTMLElement）
// options.quality: 'rough' | 'polished'
// options.frame:   'phone' | 'pc'
// 戻り値の unmount() は、作った要素・タイマー・リスナーをすべて片付ける
export function mount(viewport, options) { /* ... */ return { unmount() {} }; }
```

---

### Task 1: 土台とテストの仕組み

**Files:**
- Create: `package.json`, `playwright.config.mjs`, `site/index.html`, `site/css/base.css`, `tests/e2e/shell.spec.mjs`

**Interfaces:**
- Produces: `npm run test:unit`（`node --test tests/unit`）、`npm run test:e2e`（`playwright test`）、`npm run serve`（`python3 -m http.server 8080 -d site`）。Playwright は `webServer` で `npm run serve` を起動し、`baseURL` は `http://localhost:8080`。プロジェクトは2つ：`mac`（Desktop Chrome、1280×800）と `iphone`（chromium の iPhone 13 相当：幅390、`hasTouch: true`、`isMobile: true`）
- Produces: `index.html` に `<main id="app">`。`<html lang="ja">`、`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`、`<title>さわれるUI図鑑</title>`

- [ ] **Step 1: 失敗するテストを書く** — `tests/e2e/shell.spec.mjs`

```js
test('ページが開き、題名と #app がある', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('さわれるUI図鑑');
  await expect(page.locator('#app')).toBeAttached();
});
test('横スクロールが起きない', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});
```

- [ ] **Step 2: 失敗を確かめる** — `npm install` のあと `npm run test:e2e`。期待：title が一致せず FAIL
- [ ] **Step 3: 実装** — `base.css` は色・文字・余白を `:root` の変数で持ち、`@media (prefers-color-scheme: dark)` で暗い配色に切り替える。本文の文字は16px以上、左右の余白は16px
- [ ] **Step 4: 通ることを確かめる** — `npm run test:e2e`。期待：2プロジェクトとも PASS
- [ ] **Step 5: ユーザーの了承を得てから `git init` と最初のコミット**（`.gitignore` に `node_modules/`, `test-results/`, `playwright-report/`）

### Task 2: カードのデータと形の検査

**Files:**
- Create: `site/js/data/categories.js`, `site/js/data/patterns.js`, `tests/unit/patterns.test.mjs`

**Interfaces:**
- Produces: `CATEGORIES`, `PATTERNS`（上の「共通の形」のとおり）

- [ ] **Step 1: 失敗するテストを書く** — `tests/unit/patterns.test.mjs`

```js
test('段階1の3件がある', () => {
  const ids = PATTERNS.filter(p => p.phase === 1).map(p => p.id).sort();
  assert.deepEqual(ids, ['modal', 'pull-to-refresh', 'toast']);
});
test('id が重複しない', ...);                 // new Set(ids).size === PATTERNS.length
test('すべての必須キーが決まった型で入っている', ...); // 上の表の全キー
test('category が CATEGORIES にある', ...);
test('points は2〜4件、goodFor と badFor は1件以上', ...);
test('frames は phone / pc だけで、1件以上', ...);
test('prompts の3つがすべて空でない', ...);
test('phase 1 の見本ファイルがある', ...);     // fs.existsSync(`site/demos/${id}.js`)（Task 5〜7 で揃うまで skip にしておき、Task 7 で外す）
```

- [ ] **Step 2: 失敗を確かめる** — `npm run test:unit`。期待：import できず FAIL
- [ ] **Step 3: データを書く** — 3件の文面は設計書第4節の例をそのまま使い、足りない部分を書き足す。決まっている値：
  - toast：`category: 'feedback'`, `frames: ['phone', 'pc']`, `aliases: ['スナックバー（取り消しボタン付きの近い部品）']`, `prompts.short` は「設定画面にトーストを出して」、`prompts.detailed` は「保存したら画面下にトーストを出して。3秒で消して、マウスを乗せている間は消さない。続けて出たら重ねずに入れ替える」
  - modal：`category: 'overlay'`, `frames: ['pc', 'phone']`, `badFor` に `{ case: '長い入力フォーム', instead: '別ページにする' }` を含める
  - pull-to-refresh：`category: 'feedback'`, `frames: ['phone']`
  - 3件とも `fromVideo: true`, `phase: 1`。`points` は第4節の表の「丁寧な作り」の項目から作る
- [ ] **Step 4: 通ることを確かめる** — `npm run test:unit`。期待：見本ファイルの検査以外が PASS
- [ ] **Step 5: コミット（了承後）**

### Task 3: 一覧とカードの表示、頼み方のコピー

**Files:**
- Create: `site/js/app.js`, `site/js/card.js`, `site/js/clipboard.js`, `site/css/app.css`, `tests/e2e/card.spec.mjs`

**Interfaces:**
- Consumes: `CATEGORIES`, `PATTERNS`
- Produces:
  - 画面の切り替えはハッシュで行う。`#/` が一覧、`#/p/<id>` がカード。存在しない id は一覧に戻す
  - 幅900px以上は左に一覧・右にカードの2列。未満は1列（一覧 → カード、カードの上に「一覧へ戻る」）
  - `renderCard(pattern: Pattern, container: HTMLElement): { destroy(): void }`（`card.js`）。見本を置く場所として `container` 内に `<div data-role="demo-slot">` を作る。見本の組み込みは Task 4 が担当する
  - `copyText(text: string): Promise<'clipboard' | 'fallback' | 'manual'>`（`clipboard.js`）。`navigator.clipboard.writeText` → 一時的な `textarea` と `document.execCommand('copy')` → どちらも失敗したら対象の文章を選択状態にして `'manual'` を返す
  - 一覧の各項目は `<a href="#/p/<id>" data-pattern-id="<id>">`。分類ごとに見出しを付け、動画で紹介されたものには「動画」の印を付ける
  - カードに載せる順：日本語名（h1）と英語名・別名 → ひとことで言うと → 見本の場所 → こだわりポイント → 向いている場面・向かない場面 → AIへの頼み方（3つ、それぞれにコピーボタン `data-copy="short|detailed|swiftui"`）
  - コピー後のお知らせ：`'clipboard'` と `'fallback'` は「コピーしました」、`'manual'` は「長押しでコピーしてください」を、ボタンの近くに2秒表示する（`role="status"`）

- [ ] **Step 1: 失敗するテストを書く** — `tests/e2e/card.spec.mjs`

```js
test('一覧に3件が分類ごとに並ぶ', ...);   // [data-pattern-id] が3つ、見出し「待ち・お知らせ」「表示・重ねる」がある
test('項目を押すとカードが開き、名前と頼み方が出る', ...); // h1「トースト」、英語名 Toast、[data-copy] が3つ
test('存在しない id は一覧に戻る', ...);   // goto('/#/p/nope') → URL が #/ になる
test('コピーすると「コピーしました」が出る', ...); // context.grantPermissions(['clipboard-read','clipboard-write'])、読み戻して prompts.detailed と一致
test('clipboard がないときも代わりの方法でコピーか案内が出る', ...); // addInitScript で navigator.clipboard を undefined にし、status に「コピーしました」または「長押しでコピーしてください」
test('mac では2列、iphone では1列', ...);  // 一覧とカードの x 座標で判定
```

- [ ] **Step 2: 失敗を確かめる** — `npm run test:e2e -- card`。期待：FAIL
- [ ] **Step 3: 実装** — 上の Produces のとおり
- [ ] **Step 4: 通ることを確かめる** — `npm run test:e2e`。期待：全件 PASS
- [ ] **Step 5: コミット（了承後）**

### Task 4: 枠と、雑・丁寧の切り替え

**Files:**
- Create: `site/js/frame.js`, `site/css/frame.css`, `tests/e2e/frame.spec.mjs`, `site/demos/_fixture.js`（テスト専用の見本）
- Modify: `site/js/card.js`

**Interfaces:**
- Consumes: `renderCard` の `[data-role="demo-slot"]`、見本の `mount()` の形
- Produces:
  - `createDemoHost(slot: HTMLElement, pattern: Pattern): { destroy(): void }`（`frame.js`）。枠の切り替え（`frames` が2つ以上のときだけ表示。`data-frame-switch` の付いた2つのボタン、`aria-pressed`）と、雑・丁寧の切り替え（`data-quality-switch`、最初は「丁寧」【Claudeの判断】）を描き、`import(\`../demos/${pattern.id}.js\`)` で見本を読み込む
  - 切り替えのたびに、前の見本の `unmount()` を呼んでから新しく `mount()` する。カードを離れるとき（`destroy()`）も `unmount()` を呼ぶ
  - スマホ枠：表示領域は 375×667 を基準にし、親の幅に収まらないときは縦横比を保って縮める（枠ごと `transform: scale()` ではなく、幅に合わせて高さを決める）。上端にステータスバー風の帯を置く
  - PC枠：上にアドレスバー風の帯を置き、表示領域は 720×450 を基準に同じく縮める
  - 表示領域（`[data-role="viewport"]`）には `overflow: hidden; overscroll-behavior: contain; position: relative` を付け、見本の中の固定表示は表示領域の中に収まるようにする（`position: absolute` を使う。`position: fixed` は使わない）
  - `?fixture=1` のときだけ、一覧の末尾にテスト用の見本 `_fixture` を出す。このカードのデータは `PATTERNS` に入れず、`app.js` の中で `frames: ['phone', 'pc']` の最小限の内容で作る。`_fixture.js` は mount で `data-mounted` の数を `window.__fixtureMounts` に足し、unmount で引く

- [ ] **Step 1: 失敗するテストを書く** — `tests/e2e/frame.spec.mjs`

```js
test('トーストのカードに枠の切り替えがあり、プルトゥリフレッシュにはない', ...);
test('雑・丁寧を切り替えると aria-pressed が入れ替わる', ...);
test('切り替えやカードの移動で、見本が1つより多く残らない', ...); // _fixture で切り替えを5回 → __fixtureMounts === 1、一覧に戻る → 0
test('iphone で枠が画面からはみ出さない', ...); // viewport の boundingBox().x + width <= 390、横スクロールなし
```

- [ ] **Step 2〜4: 失敗を確かめる → 実装 → 通ることを確かめる**（`npm run test:e2e -- frame`、最後に全件）
- [ ] **Step 5: コミット（了承後）**

### Task 5: トーストの見本

**Files:**
- Create: `site/demos/toast.js`, `tests/e2e/toast.spec.mjs`

**Interfaces:**
- Consumes: 見本の `mount()` の形
- Produces: 表示領域の中に、下端に寄せた「保存」ボタン（`data-action="save"`）と、トーストを置く場所。トーストの要素には `data-toast` を付ける

決まっている値（設計書第4節の表から）：

| | 雑 | 丁寧 |
|---|---|---|
| 消えるまで | 1000ms | 4000ms（第4節の「3〜5秒」の中間） |
| 位置 | 保存ボタンに重なる | 保存ボタンより上（ボタンに重ならない） |
| 連続で押したとき | 積み重なる | 1つだけで、文言と残り時間を入れ替える |
| マウスを乗せたとき・フォーカスがあるとき | 消える | 止まり、離れてから残り時間を数え直す |
| 読み上げ | なし | `role="status"`, `aria-live="polite"` |
| 動き | なし | 下から現れて消える（reduced-motion では動かさずに出し入れ） |

- [ ] **Step 1: 失敗するテストを書く** — `tests/e2e/toast.spec.mjs`（時間は `page.clock` で進める）

```js
test('雑：1秒で消える', ...);              // 押す → clock.runFor(1100) → [data-toast] が0
test('丁寧：3秒後も残り、4.5秒で消える', ...);
test('丁寧：保存ボタンに重ならない', ...);  // 2つの boundingBox が交わらない
test('雑：保存ボタンに重なる', ...);
test('丁寧：5回押しても1つだけ／雑：5回押すと5つ', ...);
test('丁寧：マウスを乗せている間は消えない', ...); // hover → runFor(6000) → 残る → mouse.move で外す → runFor(4100) → 消える
test('丁寧：role=status がある', ...);
test('表示中に雑・丁寧を切り替えても、古いトーストが後から出ない', ...);
```

- [ ] **Step 2〜4: 失敗を確かめる → 実装 → 通ることを確かめる**
- [ ] **Step 5: コミット（了承後）**

### Task 6: モーダルの見本

**Files:**
- Create: `site/demos/modal.js`, `tests/e2e/modal.spec.mjs`

**Interfaces:**
- Produces: 表示領域の中に、スクロールできる背景の文章と「削除する」ボタン（`data-action="open"`）。開くと「本当に削除しますか？」の確認が出て、「キャンセル」「削除」ボタンと閉じるボタン（`data-action="close"`）がある。モーダル本体に `data-modal`、背景の暗い幕に `data-backdrop`

決まっている値：

| | 雑 | 丁寧 |
|---|---|---|
| Escキー | 閉じない | 閉じる |
| 幕を押す | 閉じない | 閉じる |
| 閉じるボタン | なし（キャンセルか削除を押すしかない） | あり |
| 背景のスクロール | 動いてしまう | 開いている間は止める |
| キーボードのフォーカス | 後ろの要素にも移る | モーダルの中だけを回り、閉じると「削除する」ボタンに戻る |
| 作り | `div` を重ねるだけ | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |

モーダルと幕は表示領域の中に収める（`position: absolute`）。ページ全体に `<dialog>.showModal()` を使うと枠の外まで覆ってしまうため使わない。

- [ ] **Step 1: 失敗するテストを書く** — `tests/e2e/modal.spec.mjs`

```js
test('丁寧：Esc・幕・閉じるボタンのそれぞれで閉じる', ...);
test('雑：Esc と幕では閉じない', ...);
test('丁寧：Tab を10回押してもフォーカスがモーダルの外に出ない', ...);
test('丁寧：閉じると「削除する」ボタンにフォーカスが戻る', ...);
test('丁寧：開いている間は背景がスクロールしない', ...); // 背景要素で mouse.wheel → scrollTop が変わらない
test('開いたまま一覧に戻ると、モーダルが残らない', ...); // page.goBack() → [data-modal] が0
```

- [ ] **Step 2〜4: 失敗を確かめる → 実装 → 通ることを確かめる**
- [ ] **Step 5: コミット（了承後）**

### Task 7: プルトゥリフレッシュの見本

**Files:**
- Create: `site/demos/pull-to-refresh.js`, `tests/e2e/pull-to-refresh.spec.mjs`
- Modify: `tests/unit/patterns.test.mjs`（見本ファイルの検査の skip を外す）

**Interfaces:**
- Produces: 表示領域の中に、メールの受信一覧風のリスト（`data-list`、8件以上）。リストの上に引っ張り表示（`data-ptr-indicator`）。更新が終わると先頭に新しい1件が増える。操作は Pointer Events で受け、`setPointerCapture` を使う。リストに `touch-action: pan-x`（縦の引っ張りを自分で扱う）

決まっている値：

| | 雑 | 丁寧 |
|---|---|---|
| 更新が始まる距離 | 5px 引いた時点で始まる | 指を離したとき、表示上の引っ張りが 70px 以上なら始まる |
| 引っ張りの重さ | 指と同じだけ動く | 指の移動の0.5倍だけ動く（抵抗感） |
| 引っ張り中の表示 | なし | 70px未満は「引っ張って更新」、70px以上は「離すと更新」 |
| 更新中 | 表示なし | くるくる回る印 |
| 更新の終わり | 黙って1件増える | 1件増え、「更新しました」を1.5秒表示 |
| 更新にかかる時間 | 1200ms | 1200ms |
| リストが一番上でないとき | 丁寧と同じく、引っ張りは始まらない | 引っ張りは始まらない（普通にスクロール） |

- [ ] **Step 1: 失敗するテストを書く** — `tests/e2e/pull-to-refresh.spec.mjs`（mac プロジェクトでマウスのドラッグで操作する。`page.clock` を使う）

```js
test('丁寧：100px 引いて離しても更新しない（表示上50px）', ...);
test('丁寧：160px 引くと「離すと更新」になり、離すと1件増えて「更新しました」', ...);
test('雑：10px 動かしただけで更新が始まる', ...);
test('リストを下にスクロールした状態では引っ張りが始まらない', ...);
test('更新中に雑・丁寧を切り替えても、エラーが出ず、古い更新の結果が後から足されない', ...); // page.on('pageerror') が0件
test('表示領域に overscroll-behavior: contain がある', ...);
```

- [ ] **Step 2〜4: 失敗を確かめる → 実装 → 通ることを確かめる**（最後に `npm run test:unit` と `npm run test:e2e` の全件）
- [ ] **Step 5: コミット（了承後）**

### Task 8: 実機での確認（ユーザーと一緒に行う）

自動テストでは iPhone の Safari 固有の動き（画面の端からの戻る操作、ページ全体の引っ張り更新）を確かめられないため、実機で確かめる。

- [ ] **Step 1:** Mac で `python3 -m http.server 8080 -d site --bind 0.0.0.0` を起動し、同じ Wi‑Fi の iPhone の Safari で `http://<MacのIPアドレス>:8080` を開く（初回はユーザーに起動の了承を得る）
- [ ] **Step 2:** 次をユーザーに確かめてもらう
  - 3つの見本を、雑・丁寧の両方で触れる
  - プルトゥリフレッシュの見本を引いても、Safari のページ更新が起きない
  - 見本の中で左端からスワイプしても、ページが戻らない
  - 頼み方のコピー（この接続では `navigator.clipboard` が使えないので、代わりの方法で動くこと）
  - Mac の Safari と Chrome でも同じことを確かめる
- [ ] **Step 3:** 見つかった問題と、カードの作りや切り替えの見せ方への感想を `docs/handoff.md` に記録し、段階2の計画に反映する

---

## 段階2以降

段階1の確認が終わったら、設計書第8節に沿って段階2（★の残り10個と◆8個、名前当てクイズ、覚えた印）の計画を書く。マニフェストと Service Worker、GitHub Pages への公開もそのときに入れる。
