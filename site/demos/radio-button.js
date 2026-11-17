let nextRadio = 0;

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'radio-button'; root.dataset.quality = quality;
  const name = `demo-delivery-${++nextRadio}`;
  const options = [['normal', '通常'], ['express', 'お急ぎ'], ['pickup', '店舗受け取り']];
  root.innerHTML = `<style>
    [data-demo="radio-button"] { position:absolute; inset:0; padding:16px; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; }
    [data-demo="radio-button"] fieldset { margin:0; padding:12px; min-width:0; border:1px solid var(--border); border-radius:8px; }
    [data-demo="radio-button"] label { display:flex; align-items:center; gap:10px; min-height:44px; cursor:pointer; }
    [data-demo="radio-button"] input { accent-color:var(--accent); flex-shrink:0; }
    [data-demo="radio-button"] [data-options] { display:flex; flex-wrap:wrap; gap:2px; }
    [data-demo="radio-button"] [data-option] { display:inline-flex; align-items:center; gap:2px; }
    [data-demo="radio-button"][data-quality="rough"] input { width:12px; height:12px; margin:0; }
  </style>${polished ? '<fieldset><legend>配送方法</legend>' : '<h2>お届けの設定</h2><div data-options>'}${options.map(([value, text], i) => {
    const input = `<input type="radio" name="${name}" value="${value}" ${polished && i === 0 ? 'checked' : ''} ${polished ? '' : `aria-label="${text}"`}>`;
    return polished ? `<label>${input}<span>${text}</span></label>` : `<div data-option>${input}<span>${text}</span></div>`;
  }).join('')}${polished ? '</fieldset>' : '</div>'}`;
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y';
  viewport.append(root);
  return { unmount() { events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
