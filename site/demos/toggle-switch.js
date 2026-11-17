let nextSwitch = 0;

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'toggle-switch'; root.dataset.quality = quality;
  const id = `demo-notify-${++nextSwitch}`;
  root.innerHTML = `<style>
    [data-demo="toggle-switch"] { position:absolute; inset:0; padding:16px; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; }
    [data-demo="toggle-switch"] [data-setting] { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:44px; margin-bottom:16px; }
    [data-demo="toggle-switch"] label { cursor:pointer; }
    [data-demo="toggle-switch"] [data-switch] { position:relative; flex-shrink:0; display:block; width:30px; height:16px; min-height:0; margin:0; padding:0; border:0; border-radius:20px; background:#767676; }
    [data-demo="toggle-switch"] [data-switch]::after { content:""; position:absolute; left:2px; top:2px; width:12px; height:12px; border-radius:50%; background:white; }
    [data-demo="toggle-switch"] [data-on="true"] { background:#16804b; }
    [data-demo="toggle-switch"][data-quality="polished"] [data-switch] { width:51px; height:31px; }
    [data-demo="toggle-switch"][data-quality="polished"] [data-switch]::after { width:27px; height:27px; }
    [data-demo="toggle-switch"][data-quality="polished"] [data-on="true"]::after { transform:translateX(20px); }
    [data-demo="toggle-switch"] [data-preview] { margin-top:20px; padding:16px; border:1px solid var(--border); border-radius:12px; background:var(--bg); }
    [data-demo="toggle-switch"] [data-banner] { padding:12px; margin:0; border-radius:8px; background:var(--accent-soft); }
  </style><h2>通知の設定</h2>${polished ? '<label data-setting>' : '<div data-setting>'}<span>通知を受け取る</span><button id="${id}" data-switch data-on="false" type="button" ${polished ? 'role="switch" aria-checked="false"' : ''} aria-label="通知を受け取る"></button>${polished ? '</label>' : '</div>'}${polished ? '' : '<button type="button" data-save>保存</button>'}<section data-preview aria-label="通知のプレビュー" aria-live="polite"><h3>プレビュー</h3><p>通知：<span data-state>オフ</span></p><p data-banner hidden>新しいお知らせが届きました</p></section>`;
  const control = root.querySelector('[data-switch]');
  const state = root.querySelector('[data-state]');
  const banner = root.querySelector('[data-banner]');
  let enabled = false;
  function apply() { state.textContent = enabled ? 'オン' : 'オフ'; banner.hidden = !enabled; }
  control.addEventListener('click', () => {
    enabled = !enabled;
    control.dataset.on = String(enabled);
    if (polished) { control.setAttribute('aria-checked', String(enabled)); apply(); }
  }, { signal: events.signal });
  root.querySelector('[data-save]')?.addEventListener('click', apply, { signal: events.signal });
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y';
  viewport.append(root);
  return { unmount() { events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
