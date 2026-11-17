export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'checkbox'; root.dataset.quality = quality;
  const subjects = ['ご注文の確認', '発送のお知らせ', '今週のおすすめ', '新商品のご案内'];
  function row(text, attr) {
    const input = `<input type="checkbox" ${attr} ${polished ? '' : `aria-label="${text}"`}>`;
    return polished ? `<label>${input}<span>${text}</span></label>` : `<div data-row>${input}<span>${text}</span></div>`;
  }
  root.innerHTML = `<style>
    [data-demo="checkbox"] { position:absolute; inset:0; padding:16px; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; }
    [data-demo="checkbox"] label, [data-demo="checkbox"] [data-row] { display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--border); }
    [data-demo="checkbox"] label { min-height:44px; cursor:pointer; }
    [data-demo="checkbox"] [data-row] { padding:4px 0; }
    [data-demo="checkbox"] input { accent-color:var(--accent); flex-shrink:0; }
    [data-demo="checkbox"] [aria-live] { margin:12px 0 0; color:var(--muted); }
  </style><h2>受信したメール</h2>${row('すべて選択', 'data-all')}${subjects.map(text => row(text, 'data-mail')).join('')}${polished ? '<p aria-live="polite" aria-atomic="true">0件選択中</p>' : ''}`;
  const all = root.querySelector('[data-all]');
  const mails = [...root.querySelectorAll('[data-mail]')];
  const count = root.querySelector('[aria-live]');
  function update() {
    const selected = mails.filter(input => input.checked).length;
    all.checked = selected === mails.length;
    all.indeterminate = polished && selected > 0 && selected < mails.length;
    if (count) count.textContent = `${selected}件選択中`;
  }
  all.addEventListener('change', () => {
    mails.forEach(input => { input.checked = all.checked; }); update();
  }, { signal: events.signal });
  mails.forEach(input => input.addEventListener('change', update, { signal: events.signal }));
  update();
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y';
  viewport.append(root);
  return { unmount() { events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
