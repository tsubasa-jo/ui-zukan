export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const timers = new Set();
  const root = document.createElement('div');
  root.dataset.demo = 'toast';
  root.innerHTML = `<style>
    [data-demo="toast"] { position:absolute; inset:0; padding:20px; }
    [data-demo="toast"] [data-action="save"] { position:absolute; bottom:20px; left:20px; right:20px; min-height:44px; }
    [data-demo="toast"] [data-toast] { position:relative; padding:12px 16px; border-radius:10px; background:#243247; color:white; box-shadow:0 4px 16px #0003; }
    [data-toast-stack] { position:absolute; left:20px; right:20px; bottom:20px; display:flex; flex-direction:column; gap:6px; }
    [data-demo="toast"][data-quality="rough"] [data-toast-stack] { pointer-events:none; }
    [data-demo="toast"][data-quality="polished"] [data-toast-stack] { bottom:80px; }
    [data-demo="toast"][data-quality="polished"] [data-toast] { animation:toast-life 4000ms linear; }
    @keyframes toast-life { 0%,100% { opacity:0; transform:translateY(12px); } 4.5%,95.5% { opacity:1; transform:translateY(0); } }
    @media (prefers-reduced-motion:reduce) { [data-demo="toast"] [data-toast] { animation:none !important; } }
  </style><p>設定を保存して、お知らせの出方を比べてください。</p><button type="button" data-action="save">保存</button><div data-toast-stack></div>`;
  root.dataset.quality = quality;
  viewport.append(root);
  const stack = root.querySelector('[data-toast-stack]');
  let current;
  let count = 0;
  function show() {
    if (polished && current) current.dispose();
    const node = document.createElement('div');
    node.dataset.toast = '';
    node.textContent = `保存しました（${++count}回目）`;
    if (polished) {
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      node.tabIndex = 0;
    }
    let timer;
    let remaining = polished ? 4000 : 1000;
    let started;
    let hovering = false;
    let focused = false;
    const localEvents = new AbortController();
    function stop() {
      if (timer === undefined) return;
      node.style.animationPlayState = 'paused';
      clearTimeout(timer);
      timers.delete(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (Date.now() - started));
    }
    function dispose() {
      stop(); localEvents.abort(); node.remove();
      if (current?.node === node) current = undefined;
    }
    function resume() {
      if (hovering || focused || timer !== undefined) return;
      node.style.animationPlayState = 'running';
      started = Date.now();
      timer = setTimeout(dispose, remaining);
      timers.add(timer);
    }
    if (polished) {
      const listen = (type, fn) => node.addEventListener(type, fn, { signal: localEvents.signal });
      listen('pointerenter', () => { hovering = true; stop(); });
      listen('pointerleave', () => { hovering = false; resume(); });
      listen('focusin', () => { focused = true; stop(); });
      listen('focusout', () => { focused = false; resume(); });
      current = { node, dispose };
    }
    // unmount時には、すでに消えたトーストのリスナーも残さない。
    events.signal.addEventListener('abort', dispose, { once: true, signal: localEvents.signal });
    stack.append(node);
    resume();
  }
  root.querySelector('[data-action="save"]').addEventListener('click', show, { signal: events.signal });
  return { unmount() { events.abort(); timers.forEach(clearTimeout); timers.clear(); root.remove(); } };
}
