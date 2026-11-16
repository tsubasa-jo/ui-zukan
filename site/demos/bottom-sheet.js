import { reducedMotion } from '../js/demo-kit.js';

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'bottom-sheet'; root.dataset.quality = quality;
  root.innerHTML = `<style>
    [data-demo="bottom-sheet"] { position:absolute; inset:0; overflow:hidden; }
    [data-demo="bottom-sheet"] [data-map] { height:100%; padding:24px 16px; background:repeating-linear-gradient(35deg, transparent 0 65px, #fff9 66px 80px), repeating-linear-gradient(125deg, #d8e7cf 0 90px, #eaf1e5 91px 105px); }
    [data-demo="bottom-sheet"] [data-sheet-shade] { position:absolute; inset:0; background:#0006; }
    [data-demo="bottom-sheet"] [data-sheet] { position:absolute; bottom:0; left:0; right:0; height:50%; border-radius:20px 20px 0 0; background:var(--surface); display:flex; flex-direction:column; overflow:hidden; }
    [data-demo="bottom-sheet"] [data-sheet][hidden] { display:none; }
    [data-demo="bottom-sheet"] [data-sheet][data-detent="large"] { height:90%; }
    [data-demo="bottom-sheet"] [data-grabber] { flex:0 0 44px; display:grid; place-items:center; touch-action:none; cursor:ns-resize; user-select:none; }
    [data-demo="bottom-sheet"] [data-grabber]::before { content:''; width:36px; height:5px; border-radius:4px; background:var(--muted); }
    [data-demo="bottom-sheet"] [data-sheet-content] { padding:0 20px 20px; overflow-y:auto; min-height:0; }
    [data-demo="bottom-sheet"] [data-sheet-content] h3 { margin-top:0; }
    @keyframes demo-sheet-enter { from { transform:translateY(100%); } to { transform:translateY(0); } }
  </style><div data-map><h3>川沿いの公園</h3><p>待ち合わせ場所を送りましょう。</p><button type="button" data-share>共有</button></div><div data-sheet-shade hidden></div><div data-sheet data-detent="medium" hidden ${polished ? 'role="dialog" aria-modal="true" aria-label="場所を共有" tabindex="-1"' : ''}><div data-grabber ${polished ? 'role="button" tabindex="0" aria-label="高さを切り替える"' : ''}></div><div data-sheet-content><h3>場所を共有</h3><p>川沿いの公園へのリンクを送ります。</p><p>メッセージ ／ メール ／ リンクをコピー</p><button type="button" data-close>閉じる</button></div></div>`;
  const sheet = root.querySelector('[data-sheet]');
  const shade = root.querySelector('[data-sheet-shade]');
  const background = root.querySelector('[data-map]');
  const share = root.querySelector('[data-share]');
  const grabber = root.querySelector('[data-grabber]');
  const closeButton = root.querySelector('[data-close]');
  const animate = polished && !reducedMotion();
  let drag;
  function detent(value) { sheet.dataset.detent = value; sheet.style.transform = ''; }
  function close() {
    sheet.hidden = true; shade.hidden = true; background.inert = false; drag = undefined;
    sheet.style.transform = ''; if (polished) share.focus({ preventScroll: true });
  }
  share.addEventListener('click', () => {
    detent('medium'); sheet.hidden = false; shade.hidden = false;
    if (animate) { sheet.style.animation = 'demo-sheet-enter 300ms ease-out'; sheet.style.transition = 'height 300ms ease, transform 300ms ease'; }
    if (polished) { background.inert = true; sheet.focus({ preventScroll: true }); }
  }, { signal: events.signal });
  closeButton.addEventListener('click', close, { signal: events.signal });
  if (polished) {
    shade.addEventListener('click', close, { signal: events.signal });
    root.addEventListener('keydown', event => {
      if (sheet.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        if (event.shiftKey && (document.activeElement === sheet || document.activeElement === grabber)) { event.preventDefault(); closeButton.focus(); }
        else if (!event.shiftKey && document.activeElement === closeButton) { event.preventDefault(); grabber.focus(); }
      }
    }, { signal: events.signal });
    grabber.addEventListener('keydown', event => {
      if (['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        detent(event.key === 'ArrowUp' ? 'large' : event.key === 'ArrowDown' ? 'medium' : sheet.dataset.detent === 'medium' ? 'large' : 'medium');
      }
    }, { signal: events.signal });
    grabber.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      drag = { id: event.pointerId, y: event.clientY, time: event.timeStamp, detent: sheet.dataset.detent };
      sheet.style.animation = 'none'; sheet.style.transition = 'none';
      grabber.setPointerCapture(event.pointerId);
    }, { signal: events.signal });
    grabber.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const dy = event.clientY - drag.y;
      const base = viewport.clientHeight * (drag.detent === 'medium' ? 0.5 : 0.9);
      sheet.style.transform = `translateY(${Math.max(-(viewport.clientHeight * 0.9 - base), dy)}px)`;
    }, { signal: events.signal });
    function finish(event) {
      if (drag?.id !== event.pointerId) return;
      const start = drag; drag = undefined;
      const dy = event.clientY - start.y;
      const velocity = dy / Math.max(1, event.timeStamp - start.time);
      sheet.style.transition = animate ? 'height 300ms ease, transform 300ms ease' : 'none';
      if (event.type === 'pointerup') {
        if (dy >= 120 || velocity >= 0.5) {
          if (start.detent === 'medium') close(); else detent('medium');
        } else if (dy <= -120) detent('large');
        else detent(start.detent);
      } else detent(start.detent);
      if (grabber.hasPointerCapture(event.pointerId)) grabber.releasePointerCapture(event.pointerId);
    }
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) grabber.addEventListener(type, finish, { signal: events.signal });
  }
  viewport.append(root);
  return { unmount() { events.abort(); root.remove(); } };
}
