import { later, reducedMotion } from '../js/demo-kit.js';

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'carousel'; root.dataset.quality = quality;
  root.innerHTML = `<style>
    [data-demo="carousel"] { position:absolute; inset:0; padding:20px 12px; overflow:hidden; }
    [data-demo="carousel"] [data-scroller] { display:flex; overflow-x:auto; overscroll-behavior:contain; touch-action:pan-x; scroll-snap-type:x mandatory; scrollbar-width:none; cursor:grab; }
    [data-demo="carousel"] [data-scroller]::after { content:''; flex:0 0 24px; }
    [data-demo="carousel"] [data-slide] { flex:0 0 calc(100% - 24px); height:180px; scroll-snap-align:start; display:grid; place-items:center; font-size:48px; font-weight:700; color:#18364b; border:4px solid var(--surface); border-radius:16px; user-select:none; }
    [data-demo="carousel"] [data-slide][hidden] { display:none; }
    [data-demo="carousel"][data-quality="rough"] [data-slide] { width:100%; }
    [data-demo="carousel"] [data-controls] { display:flex; justify-content:space-between; align-items:center; margin-top:16px; gap:8px; }
    [data-demo="carousel"] [data-dots] { display:flex; justify-content:center; gap:8px; margin:16px 0; }
    [data-demo="carousel"] [data-dot] { width:8px; height:8px; border-radius:50%; background:var(--border); }
    [data-demo="carousel"] [data-dot][aria-current="true"] { background:var(--accent); }
  </style><h3>週末のおすすめ</h3><div ${polished ? 'role="region" aria-roledescription="カルーセル" aria-label="週末のおすすめ"' : ''}><div ${polished ? 'data-scroller' : ''}>${['#c4e7ee', '#f7d7bb', '#d7e7bf', '#e2d1f0', '#f4cbd5'].map((color, i) => `<div data-slide style="background:${color}" ${polished ? `role="group" aria-roledescription="スライド" aria-label="${i + 1} / 5"` : ''}>${i + 1}</div>`).join('')}</div>${polished ? '<div data-controls><button type="button" aria-label="前へ">←</button><span aria-live="polite" aria-atomic="true">1 / 5</span><button type="button" aria-label="次へ">→</button></div><div data-dots aria-hidden="true">' + Array.from({ length: 5 }, () => '<span data-dot></span>').join('') + '</div>' : ''}</div>`;
  const slides = [...root.querySelectorAll('[data-slide]')];
  const dots = [...root.querySelectorAll('[data-dot]')];
  const scroller = root.querySelector('[data-scroller]');
  const buttons = [...root.querySelectorAll('button')];
  let current = 0;
  function render() {
    slides.forEach((slide, i) => { if (!polished) slide.hidden = i !== current; });
    if (polished) {
      root.querySelector('[aria-live]').textContent = `${current + 1} / 5`;
      dots.forEach((dot, i) => { if (i === current) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current'); });
      buttons[0].disabled = current === 0; buttons[1].disabled = current === 4;
    }
  }
  function go(index) {
    current = Math.max(0, Math.min(4, index)); render();
    scroller.scrollTo({ left: current * slides[0].getBoundingClientRect().width, behavior: reducedMotion() ? 'instant' : 'smooth' });
  }
  let drag;
  if (polished) {
    buttons[0].addEventListener('click', () => go(current - 1), { signal: events.signal });
    buttons[1].addEventListener('click', () => go(current + 1), { signal: events.signal });
    scroller.addEventListener('scroll', () => {
      if (drag) return;
      current = Math.max(0, Math.min(4, Math.round(scroller.scrollLeft / slides[0].getBoundingClientRect().width))); render();
    }, { signal: events.signal });
    scroller.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, left: scroller.scrollLeft };
      scroller.setPointerCapture(event.pointerId); scroller.style.scrollSnapType = 'none';
    }, { signal: events.signal });
    scroller.addEventListener('pointermove', event => {
      if (drag?.id === event.pointerId) scroller.scrollLeft = drag.left + drag.x - event.clientX;
    }, { signal: events.signal });
    const finish = event => {
      if (drag?.id !== event.pointerId) return;
      drag = undefined; scroller.style.scrollSnapType = '';
      if (scroller.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
      go(Math.round(scroller.scrollLeft / slides[0].getBoundingClientRect().width));
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) scroller.addEventListener(type, finish, { signal: events.signal });
  } else {
    const advance = () => { current = (current + 1) % 5; render(); later(2000, advance, events.signal); };
    later(2000, advance, events.signal);
  }
  const previousTouchAction = viewport.style.touchAction;
  if (polished) viewport.style.touchAction = 'pan-x';
  render(); viewport.append(root);
  return { unmount() { events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
