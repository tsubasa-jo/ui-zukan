import { PREFECTURES } from './data/prefectures.js';

let nextDropdown = 0;

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'dropdown'; root.dataset.quality = quality;
  const id = `demo-prefecture-${++nextDropdown}`;
  root.innerHTML = `<style>
    [data-demo="dropdown"] { position:absolute; inset:0; padding:16px; }
    [data-demo="dropdown"][data-quality="polished"] { overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; }
    [data-demo="dropdown"] label { display:block; margin-bottom:8px; }
    [data-demo="dropdown"] select { width:100%; min-height:44px; padding:8px; font:inherit; color:var(--text); background:var(--surface); border:1px solid var(--border); border-radius:8px; }
    [data-demo="dropdown"] [data-picker] { position:relative; padding:6px; border:1px solid var(--border); cursor:default; }
    [data-demo="dropdown"] [data-candidates] { position:absolute; top:100%; left:0; right:0; z-index:1; background:var(--surface); border:1px solid var(--border); }
    [data-demo="dropdown"] [data-prefecture] { padding:6px; }
    [data-demo="dropdown"] [data-prefecture]:hover { background:var(--accent-soft); }
  </style><h2>お届けの設定</h2>${polished ? `<label for="${id}">都道府県</label><select id="${id}"><option value="">選んでください</option>${PREFECTURES.map(({ name }) => `<option value="${name}">${name}</option>`).join('')}</select><p data-destination aria-live="polite">お届け先：未選択</p>` : `<p>都道府県</p><div data-picker><span data-value>選んでください ▾</span><div data-candidates hidden>${PREFECTURES.map(({ name }) => `<div data-prefecture>${name}</div>`).join('')}</div></div>`}`;
  const previousTouchAction = viewport.style.touchAction;
  if (polished) {
    viewport.style.touchAction = 'pan-y';
    const select = root.querySelector('select');
    select.addEventListener('change', () => {
      root.querySelector('[data-destination]').textContent = `お届け先：${select.value || '未選択'}`;
    }, { signal: events.signal });
  } else {
    const picker = root.querySelector('[data-picker]');
    const list = root.querySelector('[data-candidates]');
    picker.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') list.hidden = false;
    }, { signal: events.signal });
    picker.addEventListener('pointerleave', () => { list.hidden = true; }, { signal: events.signal });
    list.addEventListener('click', event => {
      const option = event.target.closest('[data-prefecture]');
      if (!option) return;
      root.querySelector('[data-value]').textContent = `${option.textContent} ▾`;
      list.hidden = true;
    }, { signal: events.signal });
  }
  viewport.append(root);
  return { unmount() { events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
