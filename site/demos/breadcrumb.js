import { containLinks } from '../js/demo-kit.js';

export function mount(viewport, { quality, frame }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'breadcrumb';
  root.dataset.quality = quality;
  const names = ['ホーム', '家電', 'キッチン家電', '電子レンジ', '商品詳細'];
  let current = names.length - 1;
  let expanded = false;
  root.innerHTML = `<style>
    [data-demo="breadcrumb"] { position:absolute; inset:0; padding:16px; }
    [data-demo="breadcrumb"] nav { overflow-x:auto; overscroll-behavior:contain; touch-action:pan-x; }
    [data-demo="breadcrumb"] ol { display:flex; align-items:center; list-style:none; padding:4px 0; margin:0; font-size:13px; white-space:nowrap; }
    [data-demo="breadcrumb"] li { display:flex; align-items:center; flex-shrink:0; overflow-wrap:normal; }
    [data-demo="breadcrumb"] li + li::before { content:''; width:6px; height:6px; border-top:1px solid var(--muted); border-right:1px solid var(--muted); transform:rotate(45deg); margin:0 10px 0 7px; }
    [data-demo="breadcrumb"] [aria-current="page"] { font-weight:700; }
    [data-demo="breadcrumb"] h3 { margin-top:24px; }
    [data-demo="breadcrumb"] [data-expand] { min-width:44px; min-height:44px; padding:0 8px; }
    [data-demo="breadcrumb"] [data-rough-trail] { max-width:240px; line-height:1.8; }
    [data-demo="breadcrumb"][data-frame="phone"] [data-rough-trail] { max-width:200px; font-size:14px; }
    [data-demo="breadcrumb"] [data-rough-trail] a { display:inline-block; }
  </style><div data-trail></div><h3>商品詳細</h3><p>上の階層を選んで移動できます。</p>`;
  root.dataset.frame = frame;
  const trail = root.querySelector('[data-trail]');
  function render() {
    root.querySelector('h3').textContent = names[current];
    if (!polished) {
      trail.innerHTML = `<div data-rough-trail>${names.slice(0, current + 1).map((name, i) => `<a href="${i}">${name}</a>${i < current ? ` &gt; ${frame === 'phone' && (i === 1 || i === 3) ? '<br>' : ''}` : ''}`).join('')}</div>`;
      return;
    }
    const compact = frame === 'phone' && current > 2 && !expanded;
    trail.innerHTML = `<nav aria-label="パンくずリスト"><ol>${names.slice(0, current + 1).map((name, i) => {
      if (compact && i > 0 && i < current) return i === 1 ? '<li><button type="button" data-expand aria-label="途中の階層を表示" aria-expanded="false">…</button></li>' : '';
      return `<li>${i === current ? `<span aria-current="page">${name}</span>` : `<a href="${i}">${name}</a>`}</li>`;
    }).join('')}</ol></nav>`;
  }
  containLinks(root, href => {
    const index = Number(href);
    if (!Number.isInteger(index) || index < 0 || index > current) return;
    current = index; expanded = false; render();
    // 移動で消えたリンクの代わりに、移動先の見出しへフォーカスを置く。
    if (polished) root.querySelector('h3').focus({ preventScroll: true });
  }, events.signal);
  root.addEventListener('click', event => {
    if (!event.target.closest('[data-expand]')) return;
    expanded = true; render();
    trail.querySelector('a[href="1"]').focus({ preventScroll: true });
  }, { signal: events.signal });
  root.querySelector('h3').tabIndex = -1;
  // 横スクロールを親の touch-action:none で妨げないようにする。
  const previousTouchAction = viewport.style.touchAction;
  if (polished) viewport.style.touchAction = 'pan-x';
  render(); viewport.append(root);
  return { unmount() { events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
