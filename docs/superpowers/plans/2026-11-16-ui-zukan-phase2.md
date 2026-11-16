# さわれるUI図鑑 段階2 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> このプロジェクトでは、各タスクの実作業は Codex（`/codex:rescue`）に渡し、Claude が差分とテストで確かめる。Codex の環境はポートを開けないため、E2E は Claude が実行する。

**Goal:** 見本を21個（段階1の3個＋★10個＋◆8個）に増やし、名前当てクイズと覚えた印を加え、iPhoneのホーム画面から通信なしでも開けるようにして、GitHub Pages で公開する。

**Architecture:** 段階1の形をそのまま使う。見本1つにつき `site/demos/<id>.js` を1つ、カードの文章を `site/js/data/patterns.js` に1件足す。クイズと覚えた印は、DOM を触らない計算の部分（`quiz.js`、`progress.js`）と画面の部分（`quiz-view.js`）に分け、計算の部分は `node --test` で確かめる。

**Tech Stack:** HTML / CSS / JavaScript（ES2022、外部ライブラリなし）。テストは `node --test` と Playwright 1.65（`channel: 'chrome'`、Mac の Google Chrome）。

**Spec:** `docs/2026-11-14-ui-patterns-app-design.md`（段階1の計画 `docs/superpowers/plans/2026-11-14-ui-zukan-phase1.md` の「共通の形」も引き継ぐ）

## 範囲

設計書第8節の段階2と、段階1の計画で段階2に回した「マニフェストと Service Worker、GitHub Pages への公開」を扱う。逆引きモードと残り58個は段階3で扱う。覚えた印のうち「逆引きで当てた」は、記録の形だけを用意し、画面には出さない。

段階1の実機確認では、5点とも問題なしだった（`docs/handoff.md`）。見直しの指摘はないので、カードの作りと切り替えの見せ方は段階1のまま進める。

## Global Constraints

- 外部のライブラリ、CDN、ビルドの仕組みを `site/` で使わない。テスト用の devDependencies（`@playwright/test`）だけ許す
- 外部サービスへの送信・計測をしない
- 画面の文言は日本語。英語名は各カードに併記する
- 対象：iPhoneのSafari、MacのSafariとChrome。タッチとマウスの両方で操作できる（Pointer Events）
- 表示領域（`[data-role="viewport"]`）は段階1で `touch-action: none` になっている。見本の中でスクロールさせたい要素には、見本の側で `touch-action: pan-y`（横なら `pan-x`）を付ける
- 見本の要素はすべて表示領域の中に置く。`document.body` に要素を足さない。重ねる表示は `position: absolute`（`fixed` と `<dialog>.showModal()` は使わない）
- 見本の中のリンクや操作で、アプリの `location.hash` を変えない（見本の中の「ページ移動」は見本の中だけで表現する）
- `prefers-reduced-motion: reduce` のときはアニメーションを控えめにする
- 「丁寧」の基準：スマホ枠は Apple のヒューマンインターフェイスガイドライン、PC枠は WAI-ARIA の作り方の手引き（APG）
- 見本の画面に、その動きの日本語名・英語名を出さない（クイズで答えが見えてしまうため）
- コミットは各タスクの終わりに Claude が確認を終えてから行う。各タスクの「コミット」は、ユーザーがまとめて了承した場合だけ確認なしで行い、了承がなければタスクごとに確かめる。プッシュ、GitHub のリポジトリ作成、公開は、そのつど実行前にユーザーの了承を得る

## Review Focus

テストが直接は狙っていないが、本人が触ったときに起きやすい問題。下の各行のテストを、担当するタスクに入れてある。

1. **見本の中のリンクを押す**（パンくずリスト、ハンバーガーメニュー、ボトムナビゲーション）→ アプリのカードから移動せず、見本の中で表示が変わるだけ（Task 1 の共通テスト）
2. **見本を開いたまま雑・丁寧や枠を何度も切り替え、一覧に戻る**（ツールチップ、ボトムシートなど body に要素を足しがちなもの）→ エラーが出ず、表示領域の外に要素が残らない（Task 1 の共通テスト）
3. **プライベートブラウズなどで localStorage が使えない、または中身が壊れている** → アプリは普通に動き、印はその場でだけ記録される（Task 8）
4. **オートコンプリートに日本語を入力し、変換を確定する Enter を押す** → 候補が選ばれず、変換の確定だけが起きる（Task 5）
5. **GitHub Pages では `https://<ユーザー名>.github.io/<リポジトリ名>/` の下で開く** → `/css/...` のようなルートから始まるパスがあると読み込めない。すべて `./` から始まる相対パスにする（Task 10）

---

## ファイル構成（段階2で足すもの・変えるもの）

```
site/
├── demos/<id>.js                 見本18個（下の「収録する18個」の id）
├── js/data/patterns.js           18件を追加。全件に confusedWith を追加
├── js/frame.js                   createDemoHost に options を追加（クイズ用、触った印用）
├── js/card.js                    カードに覚えた印を表示
├── js/app.js                     #/quiz の画面、ヘッダーの切り替え、一覧の印、Service Worker の登録
├── js/progress.js                覚えた印の記録（DOM なし）
├── js/quiz.js                    出題と選択肢の計算（DOM なし）
├── js/quiz-view.js               クイズの画面
├── js/demo-kit.js                見本で共通に使う小さな関数（下記）
├── manifest.webmanifest, sw.js, precache.json, icons/icon-{180,192,512}.png
tools/
├── make-precache.mjs             site/ のファイル一覧から precache.json を作る
└── make-icons.mjs, icon.html     Playwright でアイコンの PNG を書き出す
.github/workflows/pages.yml       main へのプッシュで site/ を GitHub Pages に置く
tests/
├── unit/{patterns,progress,quiz,precache}.test.mjs
└── e2e/helpers.mjs, demos-common.spec.mjs, <id>.spec.mjs, progress.spec.mjs, quiz.spec.mjs, pwa.spec.mjs
```

## 共通の形（段階1からの追加分）

**カードのデータ**に1つキーを足す。

| キー | 型 | 内容 |
|---|---|---|
| `confusedWith` | string[] | 取り違えやすい動きの id（1〜3件）。自分自身は入れない。クイズの選択肢と、間違えたときの見比べに使う |

**`site/js/demo-kit.js`**（見本の中で使ってよい共通の関数。使わなくてもよい）

```js
// signal が abort されたら timer を止める setTimeout
export function later(ms: number, fn: () => void, signal: AbortSignal): void
// 見本の中の <a> を、location.hash を変えないリンクにする（click で preventDefault して onNavigate(href) を呼ぶ）
export function containLinks(root: HTMLElement, onNavigate: (href: string) => void, signal: AbortSignal): void
// prefers-reduced-motion: reduce なら true
export function reducedMotion(): boolean
```

**`tests/e2e/helpers.mjs`**

```js
// /#/p/<id> を開き、指定があれば雑・丁寧と枠を切り替え、表示領域の locator を返す
export async function openDemo(page, id, { quality = 'polished', frame } = {}): Promise<Locator>
```

## 収録する18個

`frames` の先頭が最初に表示される枠。★は `fromVideo: true`。全件 `phase: 2`。

| id | nameJa / nameEn | 分類 | frames | 別名（決まっているもの） | confusedWith |
|---|---|---|---|---|---|
| hamburger-menu | ★ハンバーガーメニュー / Hamburger menu | navigation | phone, pc | | bottom-navigation, tabs |
| breadcrumb | ★パンくずリスト / Breadcrumbs | navigation | pc, phone | | tabs, hamburger-menu |
| tabs | ◆タブ / Tabs | navigation | pc, phone | | bottom-navigation, accordion |
| bottom-navigation | ◆ボトムナビゲーション / Bottom navigation | navigation | phone | タブバー（iOS：Tab bar） | tabs, hamburger-menu |
| carousel | ★カルーセル / Carousel | overlay | phone, pc | スライドショー | tabs, swipe-action |
| accordion | ★アコーディオン / Accordion | overlay | pc, phone | ディスクロージャー（Disclosure） | tabs, dropdown |
| bottom-sheet | ★ボトムシート / Bottom sheet | overlay | phone | シート（iOS：Sheet） | modal, hamburger-menu |
| tooltip | ◆ツールチップ / Tooltip | overlay | pc | | toast, snackbar |
| radio-button | ★ラジオボタン / Radio button | input | pc, phone | | checkbox, dropdown |
| checkbox | ◆チェックボックス / Checkbox | input | pc, phone | | radio-button, toggle-switch |
| toggle-switch | ◆トグルスイッチ / Toggle switch | input | phone, pc | スイッチ（iOS：Toggle） | checkbox, radio-button |
| dropdown | ★プルダウンメニュー / Dropdown | input | pc, phone | セレクトボックス、select（HTMLの部品名） | autocomplete, radio-button |
| autocomplete | ★オートコンプリート / Autocomplete | input | pc, phone | 入力補完、サジェスト、コンボボックス（Combobox） | dropdown, tooltip |
| skeleton-screen | ★スケルトンスクリーン / Skeleton screen | feedback | phone, pc | スケルトン | pull-to-refresh, toast |
| snackbar | ◆スナックバー / Snackbar | feedback | phone, pc | 取り消し付きのお知らせ | toast, confirm-dialog |
| confirm-dialog | ◆確認ダイアログ / Confirmation dialog | feedback | pc, phone | アラート（iOS：Alert） | modal, snackbar |
| swipe-action | ★スワイプアクション / Swipe actions | gesture | phone | スワイプで削除 | drag-reorder, carousel |
| drag-reorder | ◆ドラッグ＆ドロップでの並び替え / Drag to reorder | gesture | phone, pc | 並び替え | swipe-action, carousel |

段階1の3件には次を足す：toast `['snackbar', 'tooltip']`、modal `['confirm-dialog', 'bottom-sheet']`、pull-to-refresh `['skeleton-screen', 'swipe-action']`。

各カードの文面（summary、goodFor、badFor、points、prompts）は Codex が書く。points は各タスクの表の「丁寧」の列から2〜4個選ぶ。prompts.detailed には、その表の丁寧側の数値を入れる。名前と説明は Apple HIG、Material Design、WAI-ARIA APG の呼び方と食い違わないようにする。

---

### Task 1: 共通の下ごしらえ

**Files:**
- Create: `site/js/demo-kit.js`, `tests/e2e/helpers.mjs`, `tests/e2e/demos-common.spec.mjs`
- Modify: `site/js/data/patterns.js`（段階1の3件に confusedWith）、`tests/unit/patterns.test.mjs`

**Interfaces:**
- Produces: `later`, `containLinks`, `reducedMotion`（`demo-kit.js`）、`openDemo`（`helpers.mjs`）。上の「共通の形」のとおり

- [ ] **Step 1: 失敗するテストを書く** — `tests/unit/patterns.test.mjs` に追加・変更

```js
test('confusedWith は1〜3件で、存在する別の id を指す', ...);
test('全件に見本ファイルがある', ...);          // 段階1の「phase 1 の見本ファイルがある」を全件に広げる
// 既存の「段階1の指定された分類・枠・文面を保つ」の最後の行は、phase 1 の3件だけを見るように直す
```

`tests/e2e/demos-common.spec.mjs` は `PATTERNS` の全件について、雑・丁寧の両方で次を確かめる（件数が増えると自動で対象が増える）。

```js
test(`${id}：見本の文字に名前が出ない`, ...);      // viewport の innerText に nameJa も nameEn も含まれない
test(`${id}：見本の中のリンクを押しても hash が変わらない`, ...); // viewport 内の a[href] を全部押す → location.hash が '#/p/<id>' のまま
test(`${id}：切り替えと離脱でエラーも置き去りも出ない`, ...);
// pageerror を集める → 雑⇄丁寧を3往復、frames が2つなら枠も往復 → '#/' に戻る
// → pageerror 0件、document.body.children の数が開く前と同じ、[data-demo] が0件
```

- [ ] **Step 2: 失敗を確かめる** — `npm run test:unit`。期待：confusedWith の検査が FAIL
- [ ] **Step 3: 実装** — `demo-kit.js` と `helpers.mjs` を書き、段階1の3件に confusedWith を足す
- [ ] **Step 4: 通ることを確かめる** — `npm run test:unit` と `npm run test:e2e`。期待：全件 PASS（段階1の3件で共通テストが通る）
- [ ] **Step 5: コミット**

### Task 2: ナビゲーションの4個

**Files:**
- Create: `site/demos/{hamburger-menu,breadcrumb,tabs,bottom-navigation}.js`, `tests/e2e/{hamburger-menu,breadcrumb,tabs,bottom-navigation}.spec.mjs`
- Modify: `site/js/data/patterns.js`（4件）

**Interfaces:**
- Consumes: `demo-kit.js`、`openDemo`

**hamburger-menu**：見本は「ホーム／検索／お気に入り／設定」の4ページがあるサイト。メニューを選ぶと見本の中の見出しが変わる。

| | 雑 | 丁寧 |
|---|---|---|
| ボタン | 28×28px、記号だけで名前なし | 44×44px、`aria-label="メニュー"`、`aria-expanded`、`aria-controls` |
| 開き方 | その場に一覧が出る | 左から幅280pxのパネルが240msで出る。後ろに幕 |
| 閉じ方 | ボタンをもう一度押すしかない | Esc、幕を押す、項目を選ぶ、のどれでも閉じる |
| フォーカス | 動かない | 開くと最初の項目へ、閉じるとボタンへ戻る |
| 今いるページ | 分からない | `aria-current="page"` と太字・左の線 |

```js
test('丁寧：開くと aria-expanded が true、Esc で閉じてボタンにフォーカスが戻る', ...);
test('丁寧：幕を押すと閉じる／雑：Esc でも幕でも閉じない', ...);
test('丁寧：ボタンは44px四方以上／雑：44px未満', ...);
test('丁寧：項目を選ぶと見出しが変わり、メニューが閉じる', ...);
```

**breadcrumb**：「ホーム › 家電 › キッチン家電 › 電子レンジ › 商品詳細」の5段。上の段を押すと、見本の中がその段のページになり、パンくずも短くなる。

| | 雑 | 丁寧 |
|---|---|---|
| 作り | `div` に文字と「>」を並べる | `nav aria-label="パンくずリスト"` の中に `ol`。区切りは CSS の `::before` で描き、読み上げない |
| 今いるページ | ほかと同じリンク | リンクにせず `aria-current="page"` |
| スマホ枠 | 3行に折り返して読みにくい | 1行に収め、途中の段を「…」ボタンにまとめる。押すと全段を出す |

```js
test('丁寧：最後の段はリンクでなく aria-current="page"／雑：最後の段もリンク', ...);
test('丁寧：区切りの記号が文字として入っていない', ...);  // li の textContent に '›' も '>' も無い
test('丁寧・スマホ枠：「…」を押すと5段すべてが見える', ...);
test('上の段を押すと、見本の中がその段のページになる', ...);
```

**tabs**：「概要／仕様／レビュー」の3つのタブ。

| | 雑 | 丁寧 |
|---|---|---|
| 作り | ボタンを並べるだけ | `role="tablist"`／`tab`／`tabpanel`、`aria-selected`、`aria-controls` |
| 選択中の示し方 | 文字の色だけ | 下線と太字（色だけに頼らない） |
| キーボード | Tab で全部のタブを順に回る | ←→ で移動して選択、Home／End で端へ。Tab で入るのは選択中のタブだけ（`tabindex` を 0 と -1 で切り替える） |

```js
test('丁寧：→ を押すと次のタブが選ばれ、パネルが切り替わる', ...);
test('丁寧：tabindex=0 は選択中のタブだけ', ...);
test('丁寧：End で最後、Home で最初のタブへ', ...);
test('雑：role="tab" が無い', ...);
```

**bottom-navigation**：スマホ枠だけ。中身は縦に長い一覧で、スクロールできる。

| | 雑 | 丁寧 |
|---|---|---|
| 項目の数 | 6個 | 4個（HIG の目安は3〜5個） |
| 表示 | 記号だけ | 記号と文字（ホーム／検索／通知／マイページ） |
| 押せる大きさ | 高さ36px | 高さ49px以上、各項目の幅を等分 |
| 今いる項目 | 色だけ | 色と太字、`aria-current="page"` |
| 今いる項目をもう一度押す | 何も起きない | 中身の一覧が一番上に戻る |
| 画面下の安全領域 | 考えない | `padding-bottom: env(safe-area-inset-bottom)` |

```js
test('丁寧：4項目で文字が見える／雑：6項目で文字が無い', ...);
test('丁寧：今いる項目を押すと一覧が一番上に戻る', ...); // 一覧を scrollTop=400 にしてから押す → 0
test('丁寧：一覧は縦にスクロールできる（touch-action が pan-y）', ...);
```

- [ ] **Step 1: 失敗するテストを書く**（上の4つの spec）
- [ ] **Step 2: 失敗を確かめる** — `npm run test:e2e -- hamburger breadcrumb tabs bottom-navigation`。期待：見本が無く FAIL
- [ ] **Step 3: データ4件と見本4つを書く**
- [ ] **Step 4: 通ることを確かめる** — 同じコマンドのあと、`npm run test:unit` と `npm run test:e2e` の全件
- [ ] **Step 5: コミット**

### Task 3: 表示・重ねるの4個

**Files:**
- Create: `site/demos/{carousel,accordion,bottom-sheet,tooltip}.js` と、それぞれの spec
- Modify: `site/js/data/patterns.js`（4件）

**carousel**：5枚のスライド（色と番号の入ったカード）。

| | 雑 | 丁寧 |
|---|---|---|
| 自動で送る | 2000msごとに送り、止められない | 自動では送らない |
| 送り方 | 自動だけ | 指やマウスで横に動かす（CSS の `scroll-snap`、`touch-action: pan-x`）、前へ・次へボタン（`aria-label`） |
| 何枚目か | 分からない | 「2 / 5」の表示（`aria-live="polite"`）と点の印。次のスライドを右端に24pxのぞかせる |
| 作り | `div` を並べる | 全体に `aria-roledescription="カルーセル"`、各スライドに `aria-roledescription="スライド"` と `aria-label="2 / 5"` |

```js
test('雑：2.1秒で次のスライドに進む／丁寧：10秒たっても進まない', ...); // page.clock
test('丁寧：次へを押すと「2 / 5」になる', ...);
test('丁寧：各スライドに「n / 5」の aria-label がある', ...);
```

**accordion**：よくある質問の4項目。

| | 雑 | 丁寧 |
|---|---|---|
| 見出し | `div` を押すと開く。キーボードで届かない | 見出し（h3）の中の `button`、`aria-expanded`、`aria-controls` |
| 開閉の印 | なし | 「›」が開くと下向きに回る |
| 動き | 一瞬で開閉し、下が飛ぶ | 高さを200msで変える（reduced-motion では一瞬） |
| 押せる範囲 | 文字の部分だけ | 行全体、高さ44px以上 |
| 複数を開く | — | それぞれ別々に開閉できる |

```js
test('丁寧：Enter でも Space でも開閉し、aria-expanded が変わる', ...);
test('丁寧：見出しの行は高さ44px以上', ...);
test('雑：見出しに Tab で届かない', ...);
```

**bottom-sheet**：スマホ枠だけ。地図風の背景に「共有」ボタン。押すとシートが出る。

| | 雑 | 丁寧 |
|---|---|---|
| 出方 | 一瞬で出る | 下から300msで出る |
| 高さ | 固定 | 中（表示領域の50%）と大（90%）の2段。つまみ（grabber）を上に引くと大、下に引くと中・閉じる |
| 閉じ方 | 「閉じる」ボタンだけ | 中の状態から120px以上下に引く、または下向きに速く払う（0.5px/ms以上）、幕を押す、Esc |
| 引いて離したとき | — | 120px未満なら元の段に戻る |
| 作り | `div` | `role="dialog"`、`aria-modal="true"`、開くとシートにフォーカス |

シートには `data-sheet` と、今の段を表す `data-detent="medium|large"` を付ける。

```js
test('丁寧：つまみを150px上に引くと data-detent が large になる', ...);   // mac でマウスのドラッグ
test('丁寧：つまみを150px下に引くと閉じる／40px下では中に戻る', ...);
test('丁寧：幕を押すと閉じる／雑：幕では閉じない', ...);
test('雑：つまみを引いても高さが変わらない', ...);
```

**tooltip**：PC枠だけ。編集画面の記号だけのボタン3つ（保存、共有、削除）。

| | 雑 | 丁寧 |
|---|---|---|
| 出るまで | マウスを乗せた瞬間 | 500ms乗せ続けたら出る。キーボードでフォーカスしたときはすぐ出る |
| マウスを説明の上に動かす | 消える | 消えない（WCAG 1.4.13） |
| 消し方 | マウスを離す | マウスを離して100ms後、フォーカスが外れたとき、Esc |
| 位置 | ボタンに重なる | ボタンの上。上に場所がなければ下 |
| 作り | 見た目だけ | `role="tooltip"` と、ボタンの `aria-describedby` |

```js
test('丁寧：乗せて400msでは出ず、600msで出る', ...);   // page.clock
test('丁寧：Tab でフォーカスするとすぐ出て、Esc で消える', ...);
test('丁寧：説明の上にマウスを動かしても消えない', ...);
test('丁寧：説明がボタンに重ならない／雑：重なる', ...);
test('雑：フォーカスしても出ない', ...);
```

- [ ] **Step 1〜5:** Task 2 と同じ順（失敗するテスト → 失敗を確かめる → データ4件と見本4つ → 通ることを確かめる → コミット）

### Task 4: 選ぶ入力の3個

**Files:**
- Create: `site/demos/{radio-button,checkbox,toggle-switch}.js` と、それぞれの spec
- Modify: `site/js/data/patterns.js`（3件）

**radio-button**：配送方法を「通常／お急ぎ／店舗受け取り」から選ぶ。

| | 雑 | 丁寧 |
|---|---|---|
| 押せる範囲 | 12pxの丸だけ（文字を押しても選ばれない） | `label` で文字も含めた行全体。行の高さ44px以上 |
| 並べ方 | 横に詰めて折り返す | 縦に並べる |
| まとまり | なし | `fieldset` と `legend`（「配送方法」） |
| 最初の状態 | 何も選ばれていない | 「通常」を選んでおく |

```js
test('丁寧：文字を押すと選ばれる／雑：文字を押しても選ばれない', ...);
test('丁寧：legend「配送方法」があり、最初は「通常」が選ばれている', ...);
test('丁寧：各行の高さが44px以上', ...);
```

**checkbox**：届いたメール4件と「すべて選択」。

| | 雑 | 丁寧 |
|---|---|---|
| 押せる範囲 | 四角だけ | 文字を含めた行全体、高さ44px以上 |
| すべて選択 | 全部か無しかの2状態だけ | 一部だけ選ぶと中間の状態（`indeterminate`）。押すと全部選ぶ |
| 選んだ数 | なし | 「2件選択中」を表示（`aria-live="polite"`） |

```js
test('丁寧：1件だけ選ぶと「すべて選択」が中間の状態になる', ...);
test('丁寧：中間の状態で「すべて選択」を押すと4件とも選ばれる', ...);
test('丁寧：「2件選択中」と表示される', ...);
test('雑：1件だけ選んでも「すべて選択」は中間の状態にならない', ...);
```

**toggle-switch**：通知の設定画面。スイッチを入れると、見本の中のプレビューに通知のバナーが出るようになる。

| | 雑 | 丁寧 |
|---|---|---|
| 効くタイミング | 下の「保存」ボタンを押すまで効かない | 切り替えた瞬間に効く（保存ボタンなし） |
| 状態の示し方 | 色だけ | つまみの位置と色、`role="switch"`、`aria-checked` |
| 大きさ | 30×16px | 51×31px（iOS の標準と同じ） |
| 押せる範囲 | スイッチだけ | 名前の文字を含めた行全体 |

```js
test('丁寧：押すとすぐプレビューが「オン」になる', ...);
test('丁寧：role="switch" で aria-checked が切り替わり、Space でも切り替わる', ...);
test('雑：保存を押すまでプレビューが変わらない', ...);
```

- [ ] **Step 1〜5:** Task 2 と同じ順

### Task 5: 文字で選ぶ入力の2個

**Files:**
- Create: `site/demos/{dropdown,autocomplete}.js`、`site/demos/data/prefectures.js`（都道府県47件の `{ name, kana }`）と、それぞれの spec
- Modify: `site/js/data/patterns.js`（2件）

**dropdown**：お届け先の都道府県を選ぶ。

| | 雑 | 丁寧 |
|---|---|---|
| 作り | `div` で作った自前の一覧。マウスを乗せると開き、離れると閉じる | 標準の `<select>` と `<label>`（iPhone では iOS の選択画面が出る） |
| キーボード | 届かない | 標準どおり |
| 一覧の高さ | 47件を全部並べて表示領域からはみ出す | — |
| 選んだあと | — | 下に「お届け先：〇〇」と出る |

`points` には「迷ったら標準の select を使う。自前で作るなら WAI-ARIA の listbox の作法をすべて満たす」という趣旨を入れる。

```js
test('丁寧：label が select に結び付いていて、選ぶと「お届け先：神奈川県」と出る', ...); // selectOption
test('雑：マウスを乗せると開き、離すと閉じる', ...);
test('雑：Tab で届かない', ...);
```

**autocomplete**：都道府県の入力欄。漢字でも読み（ひらがな）でも候補が出る。

| | 雑 | 丁寧 |
|---|---|---|
| 候補の数 | 一致したものを全部出す | 最大6件 |
| 候補を出すまで | 打つたびにすぐ | 打ち終えて150ms後 |
| 一致した部分 | 示さない | 太字（`<mark>`） |
| キーボード | ↓↑ が効かない | ↓↑ で移動、Enter で決定、Esc で閉じる |
| 作り | `input` と `ul` | `role="combobox"`、`aria-expanded`、`aria-controls`、`aria-activedescendant`、候補は `role="listbox"`／`option` |
| 一致なし | 何も出ない | 「該当する都道府県がありません」 |
| 変換中の Enter | 候補を選んでしまう | 選ばない（`event.isComposing` を見る） |

```js
test('丁寧：「か」と打つと候補が6件以下で出て、一致部分が mark になる', ...); // かながわけん・かがわけん・かごしまけん を含む
test('丁寧：↓ で aria-activedescendant が動き、Enter で入力欄に入る', ...);
test('丁寧：Esc で候補が閉じ、aria-expanded が false になる', ...);
test('丁寧：変換中の Enter では候補を選ばない', ...);
// keydown を { key: 'Enter', isComposing: true } で dispatchEvent → 入力欄の値が変わらず、候補は開いたまま
test('丁寧：一致しないと「該当する都道府県がありません」', ...);
test('雑：↓ を押しても aria-activedescendant が付かない', ...);
```

- [ ] **Step 1〜5:** Task 2 と同じ順。`demos/data/` を作ったので、`tests/unit/patterns.test.mjs` の見本ファイルの検査がこのフォルダを見本と取り違えないことも確かめる

### Task 6: 待ち・お知らせの3個

**Files:**
- Create: `site/demos/{skeleton-screen,snackbar,confirm-dialog}.js` と、それぞれの spec
- Modify: `site/js/data/patterns.js`（3件）

**skeleton-screen**：記事の一覧（画像・題名・2行の説明が4件）。「もう一度読み込む」ボタンで読み込み直す。読み込みは両方とも2000ms。

| | 雑 | 丁寧 |
|---|---|---|
| 読み込み中 | 真っ白（真ん中に「読み込み中…」の文字だけ） | 最後の形と同じ大きさの灰色の箱（`data-skeleton`）。光が流れる動き（reduced-motion では止める） |
| 読み込みの状態 | なし | 一覧に `aria-busy="true"`、終わると `false` |
| 終わったとき | 中身が出て、下の要素の位置がずれる | 箱と中身の高さが同じで、位置がずれない |

```js
test('丁寧：読み込み中は data-skeleton があり aria-busy="true"、2.1秒後に中身と false', ...);
test('丁寧：読み込みの前後で、各行の高さの差が1px以内', ...);
test('雑：読み込み中に data-skeleton が無い', ...);
```

**snackbar**：メールの一覧。各行の「削除」を押すと消え、お知らせが出る。

| | 雑 | 丁寧 |
|---|---|---|
| 取り消し | なし | 「取り消す」ボタン。押すと元の位置に戻る |
| 表示時間 | 1500ms | 6000ms（取り消しのボタンがあるので長め）。マウスを乗せている間、フォーカスがある間は止まる |
| 続けて削除 | 積み重なる | 1つだけ。新しい削除のお知らせに入れ替える |
| 読み上げ | なし | `role="status"` |

```js
test('丁寧：削除して「取り消す」を押すと、元と同じ位置に戻る', ...);
test('丁寧：5.9秒では残り、6.1秒で消える／雑：1.6秒で消える', ...); // page.clock
test('雑：「取り消す」ボタンが無い', ...);
```

**confirm-dialog**：写真の一覧の「旅行の写真」を削除する。モーダルの見本（段階1）とは、問いかけの言葉とボタンの作りを比べるところが違う。

| | 雑 | 丁寧 |
|---|---|---|
| 見出し | 「よろしいですか？」 | 「『旅行の写真』を削除しますか？」 |
| 説明 | なし | 「削除すると元に戻せません。」 |
| ボタンの文字 | 「OK」「キャンセル」 | 「削除」「キャンセル」（動作を言う） |
| ボタンの見た目 | 同じ色 | 「削除」は赤（取り返しのつかない操作） |
| 最初のフォーカス | 「OK」 | 「キャンセル」（安全な方） |
| Esc | 閉じない | キャンセルとして閉じる |
| 作り | `div` | `role="alertdialog"`、`aria-labelledby`、`aria-describedby` |

```js
test('丁寧：開くと「キャンセル」にフォーカスがあり、role="alertdialog"', ...);
test('丁寧：Esc で閉じ、写真は残る', ...);
test('丁寧：ボタンの文字が「削除」で「OK」が無い／雑：「OK」がある', ...);
test('雑：開くと「OK」にフォーカスがある', ...);
```

- [ ] **Step 1〜5:** Task 2 と同じ順

### Task 7: 指で操作する2個

**Files:**
- Create: `site/demos/{swipe-action,drag-reorder}.js` と、それぞれの spec
- Modify: `site/js/data/patterns.js`（2件）

**swipe-action**：スマホ枠だけ。メールの一覧（8件）。行を左に引くと「削除」が出る。

| | 雑 | 丁寧 |
|---|---|---|
| 一覧の `touch-action` | `none`（縦にスクロールできない） | `pan-y`（縦は普通にスクロール、横は自分で扱う） |
| 離したとき | 引いた位置で止まる | 40px以上引いていれば「削除」ボタン（幅80px）が見える位置に吸い付く。40px未満なら戻る |
| 開いている行 | いくつでも開く | 1行だけ。ほかの行を引くか、ほかを押すと閉じる |
| 端まで引く | 確認なしで消える | 行の幅の60%以上引いて離すと消え、「取り消す」付きのお知らせが出る |

行には `data-row` と、今のずれを表す `data-offset`（px の整数、開いていれば `-80`）を付ける。

```js
test('丁寧：60px 左に引いて離すと data-offset が -80 になる', ...);   // mac でマウスのドラッグ
test('丁寧：別の行を開くと、前の行は閉じる', ...);
test('丁寧：幅の60%以上引くと消え、「取り消す」で戻る', ...);
test('雑：30px 引いて離すと -30 のまま止まる', ...);
test('一覧の touch-action が 丁寧は pan-y、雑は none', ...);
```

**drag-reorder**：買い物リスト5件（牛乳、卵、パン、りんご、コーヒー）。

| | 雑 | 丁寧 |
|---|---|---|
| つかむ場所 | 行のどこでも、触れた瞬間に動き出す（スクロールとぶつかる） | 右端の「≡」つまみだけ（つまみに `touch-action: none`、行は `pan-y`）。つまみは44px四方 |
| 動かしている間 | 行だけが動き、ほかの行は動かない | 持ち上げた行に影、ほかの行が200msで場所を空ける |
| キーボード | できない | つまみにフォーカスして Space で持ち上げ、↑↓ で動かし、Space で置く。Esc で元に戻す |
| 読み上げ | なし | 「りんごを2番目に移動しました」を `aria-live="polite"` で伝える |

```js
test('丁寧：牛乳のつまみを2行ぶん下にドラッグすると、卵・パン・牛乳の順になる', ...);
test('丁寧：Space・↓・Space で1つ下がり、「2番目に移動しました」と伝える', ...);
test('丁寧：持ち上げてから Esc で元の順に戻る', ...);
test('雑：つまみが無く、キーボードでは動かせない', ...);
```

- [ ] **Step 1〜5:** Task 2 と同じ順

### Task 8: 覚えた印

**Files:**
- Create: `site/js/progress.js`, `tests/unit/progress.test.mjs`, `tests/e2e/progress.spec.mjs`
- Modify: `site/js/frame.js`, `site/js/card.js`, `site/js/app.js`, `site/css/app.css`

**Interfaces:**
- Produces（`progress.js`、DOM を触らない）:
  - `createProgressStore(storage?: Storage | null): ProgressStore`。引数を省くと `globalThis.localStorage` を try で取り、使えなければ記録はその場だけに持つ
  - `ProgressStore.get(id): { touched: boolean, named: boolean, reversed: boolean }`
  - `ProgressStore.mark(id, kind: 'touched' | 'named' | 'reversed'): void`（変わったときだけ保存し、購読者に知らせる）
  - `ProgressStore.count(ids: string[]): { touched: number, named: number, reversed: number }`
  - `ProgressStore.subscribe(fn: () => void): () => void`（戻り値で購読をやめる）
  - 保存のキーは `uiz-progress-v1`。形は `{ "<id>": { "touched": true, "named": true } }`。false のキーは書かない
- Modifies: `createDemoHost(slot, pattern, options?)` に `options = { controls: true, quality: 'polished', onInteract: undefined }` を足す。`onInteract` は、表示領域の中で `pointerdown` か `keydown` が起きたとき、組み込みごとに1回だけ呼ぶ。`controls: false` なら枠と雑・丁寧の切り替えを出さない（Task 9 が使う）
- 画面：
  - ヘッダーの下に「触った 5 / 21 ・ 名前を言えた 3 / 21」（`data-role="progress-summary"`）
  - 一覧の各項目に、記録があれば「触」「名」の小さな印（`data-mark="touched"`、`data-mark="named"`）。読み上げ用に「触った」「名前を言えた」の文字を `visually-hidden` で持つ
  - カードの名前の下にも同じ印
  - 「逆引きで当てた」は段階2では画面に出さない

```js
// tests/unit/progress.test.mjs（Storage の代わりに Map で作った偽物を渡す）
test('mark で記録され、作り直しても読み戻せる', ...);
test('同じ印を2回付けても、保存と通知は1回', ...);
test('storage の getItem が例外を投げても動き、記録はその場で持つ', ...);
test('壊れた JSON や想定外の形が入っていても、空として扱う', ...); // 'not json'、'[]'、'{"toast":"yes"}'
test('count は ids の中で印の付いた数を数える', ...);
```

```js
// tests/e2e/progress.spec.mjs
test('カードを開いただけでは「触」が付かず、見本を押すと付く', ...);
test('印はページを読み込み直しても残る', ...);
test('ヘッダーの数が「触った 1 / 21」になる', ...);
test('localStorage が使えなくても一覧とカードが動く', ...);
// addInitScript で Storage.prototype.getItem と setItem を例外にする → 見本を押すと印が付き、pageerror 0件
```

- [ ] **Step 1: 失敗するテストを書く**（上の2ファイル）
- [ ] **Step 2: 失敗を確かめる** — `npm run test:unit` と `npm run test:e2e -- progress`。期待：FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: 通ることを確かめる** — 全件
- [ ] **Step 5: コミット**

### Task 9: 名前当てクイズ

**Files:**
- Create: `site/js/quiz.js`, `site/js/quiz-view.js`, `tests/unit/quiz.test.mjs`, `tests/e2e/quiz.spec.mjs`
- Modify: `site/js/app.js`, `site/index.html`, `site/css/app.css`

**Interfaces:**
- Consumes: `PATTERNS`、`createProgressStore`、`createDemoHost(slot, pattern, { controls: false })`
- Produces（`quiz.js`、DOM を触らない。`rng` は `() => number`（0以上1未満）で、テストでは決まった列を返す関数を渡す）:
  - `pickRound(patterns, progress: ProgressStore, rng, count = 5): Pattern[]` — 重複なしで `count` 件。「名前を言えた」が付いていないものを先に、足りなければ付いているものから選ぶ
  - `buildChoices(answer, patterns, rng): Pattern[]` — 4件。正解1件と、`answer.confusedWith` から最大2件、残りは同じ分類、それでも足りなければほかの分類から。重複なし、並びは rng で混ぜる
- 画面（`quiz-view.js`）:`renderQuiz(container, { patterns, progress, rng = Math.random }): { destroy(): void }`
  - ルートは `#/quiz`。ヘッダーに「図鑑」（`#/`）と「クイズ」（`#/quiz`）の切り替えを置き、今の画面に `aria-current="page"`
  - 1問の流れ：「1 / 5」の表示 → 見本（丁寧、`frames[0]`、切り替えなし）→「この動きの名前は？」→ 4つの選択肢（日本語名と英語名）
  - 正解：「正解」と出して `progress.mark(id, 'named')`
  - 不正解：「正解は〇〇」と出し、選んだ名前の動きと正解の動きを並べて見比べる（Mac 幅では左右、iPhone 幅では上下。それぞれ見本・名前・ひとことで言うと・カードへのリンク）
  - 答えたあとは選択肢を押せなくし、「次の問題」ボタンを出す
  - 5問のあと「5問中3問正解」と、「もう一度」「図鑑に戻る」
  - 画面を離れるとき、見本をすべて取り外す

```js
// tests/unit/quiz.test.mjs
test('pickRound は重複なく5件を返し、名前を言えたものを後回しにする', ...);
test('buildChoices は正解を含む4件で、重複がない', ...);
test('buildChoices は confusedWith を優先して入れる', ...); // toast → snackbar と tooltip が入る
test('同じ rng なら同じ結果になる', ...);
```

```js
// tests/e2e/quiz.spec.mjs（addInitScript で Math.random を決まった列に差し替える）
test('ヘッダーの「クイズ」で #/quiz が開き、「1 / 5」と選択肢4つが出る', ...);
test('問題の見本には雑・丁寧の切り替えが無い', ...);
test('正解を選ぶと「正解」と出て、その動きに「名」の印が付く', ...);
test('間違えると「正解は」と出て、見本が2つ並ぶ', ...);
test('5問答えると「5問中」の結果が出て、「もう一度」で1問目に戻る', ...);
test('クイズの途中で図鑑に戻ると、見本が残らない', ...); // [data-demo] が0件
```

- [ ] **Step 1〜5:** 失敗するテスト → 失敗を確かめる（`npm run test:unit`、`npm run test:e2e -- quiz`）→ 実装 → 全件が通ることを確かめる → コミット

### Task 10: ホーム画面に追加と、通信なしでの起動

**Files:**
- Create: `site/manifest.webmanifest`, `site/sw.js`, `site/precache.json`, `site/icons/icon-{180,192,512}.png`, `tools/make-precache.mjs`, `tools/make-icons.mjs`, `tools/icon.html`, `tests/unit/precache.test.mjs`, `tests/e2e/pwa.spec.mjs`
- Modify: `site/index.html`, `site/js/app.js`, `site/css/base.css`, `package.json`, `playwright.config.mjs`

**Interfaces:**
- `package.json` の scripts に `"precache": "node tools/make-precache.mjs"` と `"icons": "node tools/make-icons.mjs"`
- `precache.json`：`{ "files": ["./", "./index.html", "./css/app.css", ...] }`。`site/` の下の全ファイル（`sw.js` と `precache.json` 自身を除く）を `./` から始まる相対パスで、並べ替えて持つ
- `sw.js`（ES モジュールにしない、普通のスクリプト）：
  - install で `precache.json` を読み、全ファイルをキャッシュ `uiz-v1` に入れて `skipWaiting()`
  - activate で `clients.claim()` し、`uiz-v1` 以外のキャッシュを消す
  - 同じ出どころの GET は、キャッシュがあればすぐ返し、裏で取り直してキャッシュを更新する（stale-while-revalidate）。新しい版は次に開いたときに出る
- `manifest.webmanifest`：`name` は「さわれるUI図鑑」、`short_name` は「UI図鑑」、`start_url` と `scope` は `./`、`display` は `standalone`、`lang` は `ja`、アイコンは 192 と 512、`theme_color` と `background_color` は `base.css` のライトの背景色
- `index.html`：`<link rel="manifest" href="./manifest.webmanifest">`、`<link rel="apple-touch-icon" href="./icons/icon-180.png">`、`<meta name="apple-mobile-web-app-capable" content="yes">`、`<meta name="apple-mobile-web-app-title" content="UI図鑑">`、`<meta name="theme-color" ...>`
- `base.css`：ホーム画面から開いたとき画面の切り欠きに隠れないよう、`body` の上下左右に `env(safe-area-inset-*)` の余白を足す
- `app.js`：`'serviceWorker' in navigator` なら `navigator.serviceWorker.register('./sw.js')`
- `playwright.config.mjs`：`use` に `serviceWorkers: 'block'` を足す（ほかのテストにキャッシュが混ざらないように）。`pwa.spec.mjs` だけ `test.use({ serviceWorkers: 'allow' })`
- アイコン：`tools/icon.html` に、角の丸い四角に「UI」の文字のアイコンを HTML と CSS で描き、`make-icons.mjs` が Playwright で 180・192・512px の PNG に書き出す。できた PNG はコミットする

```js
// tests/unit/precache.test.mjs
test('precache.json に site/ の全ファイルが入っている', ...);  // 見本を足して precache を作り直し忘れると FAIL
test('site/ にルートから始まるパスが無い', ...);
// .html .css .js .webmanifest の中に、src="/ href="/ url(/ import('/ from '/ "start_url": "/ のどれも無い
```

```js
// tests/e2e/pwa.spec.mjs（mac プロジェクトだけで走らせる）
test('マニフェストが読め、name が「さわれるUI図鑑」', ...);
test('一度開いたあと通信を切っても、まだ開いていないカードの見本まで動く', ...);
// goto('/') → serviceWorker.ready と controller を待つ → context.setOffline(true)
// → reload → 一覧が出る → '#/p/drag-reorder' を開く → [data-demo] が出る
```

- [ ] **Step 1〜5:** 失敗するテスト → 失敗を確かめる → 実装（`npm run icons`、`npm run precache` を実行してできたファイルもコミットに入れる）→ 全件が通ることを確かめる → コミット

### Task 11: 公開と実機確認（ユーザーと一緒に行う）

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `docs/handoff.md`

**Interfaces:**
- `pages.yml`：`main` へのプッシュと手動実行で動く。`actions/checkout@v4` → `actions/setup-node@v4`（Node 22）→ `npm ci` → `npm run test:unit` → `actions/configure-pages@v5` → `actions/upload-pages-artifact@v3`（`path: site`）→ `actions/deploy-pages@v4`。権限は `pages: write` と `id-token: write`。E2E は CI では走らせない（手元で走らせる）

- [ ] **Step 1:** `pages.yml` を書き、コミットする
- [ ] **Step 2: ユーザーの了承を得てから**、GitHub にリポジトリを作る。作る前に、リポジトリの名前と、公開（public）にしてよいかを確かめる。無料の GitHub では、GitHub Pages を使うには公開リポジトリが要る。リポジトリの中身は設計書・計画・引き継ぎメモを含めてすべて見えるようになる
- [ ] **Step 3: ユーザーの了承を得てから**、プッシュし、Pages の公開元を「GitHub Actions」にする（`gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`）。Actions が通り、公開の URL が開けることを確かめる
- [ ] **Step 4:** ユーザーに iPhone で確かめてもらう
  - Safari で公開の URL を開き、18個の見本を雑・丁寧の両方で触れる
  - カルーセル、ボトムシート、スワイプアクション、並び替えで、Safari のページ更新や「戻る」が起きない。一覧のスクロールも止まらない
  - クイズを1回り遊べる。印が付き、Safari を閉じて開き直しても残る
  - 共有メニューから「ホーム画面に追加」し、ホーム画面から開くとブラウザのバーなしで開く。画面の上下が切り欠きや丸い角に隠れない
  - 機内モードにして、ホーム画面から開いても動く
  - Mac の Safari と Chrome でも、見本とクイズを確かめる
- [ ] **Step 5:** 見つかった問題と感想を `docs/handoff.md` に記録し、段階3の計画に反映する

---

## 段階3へ

段階2の確認が終わったら、残り58個と逆引きモードの計画を、分類ごとに区切って書く。逆引きで当てたときは `progress.mark(id, 'reversed')` を使い、一覧の印に「逆」を足す。
