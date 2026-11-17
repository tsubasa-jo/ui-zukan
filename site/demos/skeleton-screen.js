import { later } from '../js/demo-kit.js';

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  let loading;
  const root = document.createElement('div');
  root.dataset.demo = 'skeleton-screen'; root.dataset.quality = quality;
  root.innerHTML = `<style>
    [data-demo="skeleton-screen"] { position:absolute; inset:0; padding:16px; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; }
    [data-demo="skeleton-screen"] h2 { margin:0 0 16px; font-size:1.2rem; }
    [data-demo="skeleton-screen"] [data-articles] { display:grid; gap:12px; }
    [data-demo="skeleton-screen"] [data-article] { display:grid; grid-template-columns:72px minmax(0,1fr); gap:12px; align-items:center; box-sizing:border-box; height:112px; padding:12px; border:1px solid var(--border); border-radius:10px; }
    [data-demo="skeleton-screen"] [data-image] { display:grid; place-items:center; height:72px; border-radius:8px; background:#d9e9df; font-size:28px; }
    [data-demo="skeleton-screen"] h3 { font-size:1rem; line-height:24px; margin:0 0 8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    [data-demo="skeleton-screen"] [data-copy] { font-size:13px; line-height:20px; height:40px; margin:0; }
    [data-demo="skeleton-screen"] [data-line] { display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; height:20px; }
    [data-demo="skeleton-screen"] [data-skeleton] [data-image],
    [data-demo="skeleton-screen"] [data-skeleton] [data-title],
    [data-demo="skeleton-screen"] [data-skeleton] [data-line] { background:linear-gradient(100deg,#e0e3e8 25%,#f5f6f8 45%,#e0e3e8 65%); background-size:240% 100%; animation:demo-article-light 1400ms linear infinite; }
    [data-demo="skeleton-screen"] [data-title] { height:24px; margin-bottom:8px; border-radius:4px; }
    [data-demo="skeleton-screen"] [data-skeleton] [data-line] { height:14px; margin:3px 0; border-radius:3px; }
    [data-demo="skeleton-screen"] [data-skeleton] [data-line]:last-child { width:80%; }
    [data-demo="skeleton-screen"] [data-loading] { text-align:center; padding:16px; color:var(--muted); }
    [data-demo="skeleton-screen"] button { min-height:44px; margin-top:16px; }
    @keyframes demo-article-light { from { background-position:100% 0; } to { background-position:-100% 0; } }
    @media (prefers-reduced-motion:reduce) { [data-demo="skeleton-screen"] [data-skeleton] * { animation:none !important; } }
  </style><h2>週末の読みもの</h2><div data-articles ${polished ? 'aria-label="記事の一覧" aria-busy="true"' : ''}></div><button type="button">もう一度読み込む</button>`;
  const list = root.querySelector('[data-articles]');
  const articles = [
    ['木陰を歩く', '緑の道でひと休み。', '週末に歩きたい散歩道を紹介します。', '♧'],
    ['朝のコーヒー', '豆を選んでゆっくりと。', '自宅で楽しむ一杯のいれ方。', '☕'],
    ['小さな本棚', '好きな本を手の届く場所へ。', '部屋に合う本棚を探しました。', '▤'],
    ['海辺の休日', '波の音を聞きながら。', '海沿いの町で過ごす一日。', '≈'],
  ];
  function load() {
    loading?.abort(); loading = new AbortController();
    if (polished) list.setAttribute('aria-busy', 'true');
    list.innerHTML = polished ? articles.map(() => `<div data-article data-skeleton aria-hidden="true"><div data-image></div><div><div data-title></div><div data-copy><span data-line></span><span data-line></span></div></div></div>`).join('') : '<p data-loading>読み込み中…</p>';
    later(2000, () => {
      list.innerHTML = articles.map(([title, first, second, image]) => `<article data-article><div data-image aria-hidden="true">${image}</div><div><h3>${title}</h3><p data-copy><span data-line>${first}</span><span data-line>${second}</span></p></div></article>`).join('');
      if (polished) list.setAttribute('aria-busy', 'false');
    }, loading.signal);
  }
  root.querySelector('button').addEventListener('click', load, { signal: events.signal });
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y'; viewport.append(root); load();
  return { unmount() { loading?.abort(); events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
