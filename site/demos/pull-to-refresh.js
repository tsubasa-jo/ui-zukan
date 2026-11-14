export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const timers = new Set();
  const root = document.createElement('div'); root.dataset.demo = 'pull-to-refresh';
  root.innerHTML = `<style>
    [data-demo="pull-to-refresh"] { position:absolute; inset:0; overflow:hidden; }
    [data-ptr-indicator] { position:absolute; top:0; left:0; right:0; height:70px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:14px; }
    [data-list] { position:relative; height:100%; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-x; list-style:none; margin:0; padding:0; background:var(--surface); }
    [data-list] li { min-height:100px; padding:20px 16px; border-bottom:1px solid var(--border); }
    [data-list] strong, [data-list] span { display:block; }
    [data-list] span { color:var(--muted); font-size:14px; }
    [data-spinner] { display:inline-block; width:20px; height:20px; border:3px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:ptr-spin 800ms linear infinite; }
    @keyframes ptr-spin { to { transform:rotate(360deg); } }
    @media (prefers-reduced-motion:reduce) { [data-spinner] { animation:none; } }
  </style><div data-ptr-indicator></div><ul data-list aria-label="受信一覧"></ul>`;
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y';
  viewport.append(root);
  const list = root.querySelector('[data-list]');
  const indicator = root.querySelector('[data-ptr-indicator]');
  if (polished) { indicator.setAttribute('role', 'status'); indicator.setAttribute('aria-live', 'polite'); }
  function item(title) {
    const li = document.createElement('li'); const strong = document.createElement('strong'); const span = document.createElement('span');
    strong.textContent = title; span.textContent = 'メールを受信しました。'; li.append(strong, span); return li;
  }
  for (let i = 1; i <= 8; i++) list.append(item(`お知らせ ${i}`));
  let pointer;
  let startY;
  let pull = 0;
  let scrolling = false;
  let refreshing = false;
  let added = 0;
  function later(fn, ms) {
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer);
  }
  function translate(distance) { list.style.transform = `translateY(${distance}px)`; }
  function reset() { pull = 0; translate(0); indicator.replaceChildren(); }
  function refresh() {
    if (refreshing) return;
    refreshing = true;
    if (polished) {
      translate(70); indicator.replaceChildren();
      const spinner = document.createElement('span'); spinner.dataset.spinner = ''; spinner.setAttribute('aria-label', '更新中'); indicator.append(spinner);
    } else translate(0);
    later(() => {
      list.prepend(item(`新しいお知らせ ${++added}`));
      if (polished) {
        indicator.textContent = '更新しました';
        later(() => { reset(); refreshing = false; }, 1500);
      } else { reset(); refreshing = false; }
    }, 1200);
  }
  const listen = (type, fn, options = {}) => list.addEventListener(type, fn, { ...options, signal: events.signal });
  listen('pointerdown', event => {
    if (refreshing || pointer !== undefined || list.scrollTop > 0 || !event.isPrimary || event.button !== 0) return;
    pointer = event.pointerId; startY = event.clientY; pull = 0; scrolling = false;
    list.setPointerCapture(pointer);
  });
  listen('pointermove', event => {
    if (event.pointerId !== pointer || refreshing) return;
    const distance = event.clientY - startY;
    if (distance < 0 || scrolling) {
      scrolling = true;
      event.preventDefault();
      reset();
      list.scrollTop = Math.max(0, -distance);
      return;
    }
    event.preventDefault();
    pull = distance * (polished ? 0.5 : 1);
    translate(pull);
    if (polished) indicator.textContent = pull >= 70 ? '離すと更新' : '引っ張って更新';
    else if (pull >= 5) refresh();
  });
  function release(event, cancelled = false) {
    if (event.pointerId !== pointer) return;
    const id = pointer; pointer = undefined;
    list.style.touchAction = list.scrollTop > 0 ? 'pan-y' : 'pan-x';
    if (list.hasPointerCapture(id)) list.releasePointerCapture(id);
    if (refreshing) return;
    if (!cancelled && polished && pull >= 70) refresh(); else reset();
  }
  listen('pointerup', event => release(event));
  listen('pointercancel', event => release(event, true));
  listen('lostpointercapture', event => release(event, true));
  // 上端以外では通常の縦スクロールを許可する。進行中のジェスチャーは変更しない。
  listen('scroll', () => { if (pointer === undefined) list.style.touchAction = list.scrollTop > 0 ? 'pan-y' : 'pan-x'; });
  return { unmount() {
    events.abort(); timers.forEach(clearTimeout); timers.clear();
    if (pointer !== undefined && list.hasPointerCapture(pointer)) list.releasePointerCapture(pointer);
    pointer = undefined; viewport.style.touchAction = previousTouchAction; root.remove();
  } };
}
