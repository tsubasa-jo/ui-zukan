let nextTabs = 0;

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'tabs';
  root.dataset.quality = quality;
  const prefix = `demo-tabs-${++nextTabs}`;
  const names = ['概要', '仕様', 'レビュー'];
  const contents = ['毎日の料理に使える、コンパクトな一台です。', '容量：20L。出力：500W／600W。', '温める時間を選びやすく、手入れも簡単でした。'];
  root.innerHTML = `<style>
    [data-demo="tabs"] { position:absolute; inset:0; padding:20px 12px; }
    [data-demo="tabs"] [data-tab-list] { display:flex; border-bottom:1px solid var(--border); }
    [data-demo="tabs"] button { flex:1; min-width:0; padding:8px 4px; border:0; border-bottom:3px solid transparent; border-radius:0; }
    [data-demo="tabs"] [data-selected="true"] { color:var(--accent); }
    [data-demo="tabs"][data-quality="polished"] [data-selected="true"] { border-bottom-color:var(--accent); font-weight:700; }
    [data-demo="tabs"] [data-tab-panel] { padding:20px 8px; }
  </style><div data-tab-list ${polished ? 'role="tablist" aria-label="商品情報"' : ''}>${names.map((name, i) => `<button type="button" id="${prefix}-tab-${i}" ${polished ? `role="tab" aria-controls="${prefix}-panel-${i}"` : ''}>${name}</button>`).join('')}</div>${contents.map((text, i) => `<div data-tab-panel id="${prefix}-panel-${i}" ${polished ? `role="tabpanel" aria-labelledby="${prefix}-tab-${i}" tabindex="0"` : ''}><p>${text}</p></div>`).join('')}`;
  const buttons = [...root.querySelectorAll('button')];
  const panels = [...root.querySelectorAll('[data-tab-panel]')];
  let selected = 0;
  function select(index, focus = false) {
    selected = index;
    buttons.forEach((button, i) => {
      button.dataset.selected = String(i === index);
      panels[i].hidden = i !== index;
      if (polished) { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; }
    });
    if (focus) buttons[index].focus({ preventScroll: true });
  }
  buttons.forEach((button, i) => button.addEventListener('click', () => select(i), { signal: events.signal }));
  if (polished) root.querySelector('[data-tab-list]').addEventListener('keydown', event => {
    let index;
    if (event.key === 'ArrowRight') index = (selected + 1) % buttons.length;
    else if (event.key === 'ArrowLeft') index = (selected + buttons.length - 1) % buttons.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else return;
    event.preventDefault(); select(index, true);
  }, { signal: events.signal });
  select(0); viewport.append(root);
  return { unmount() { events.abort(); root.remove(); } };
}
