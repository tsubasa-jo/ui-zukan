export function mount(viewport, { quality, frame }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const previousTouchAction = viewport.style.touchAction;
  const root = document.createElement('div');
  root.dataset.demo = 'drag-reorder'; root.dataset.quality = quality;
  root.innerHTML = `<style>
    [data-demo="drag-reorder"] { position:absolute; inset:0; overflow-y:auto; overscroll-behavior:contain; padding:20px 16px; touch-action:pan-y; }
    [data-demo="drag-reorder"] h2 { margin:0 0 12px; font-size:1.2rem; }
    [data-demo="drag-reorder"] [data-list] { position:relative; height:320px; padding:0; margin:16px 0; list-style:none; }
    [data-demo="drag-reorder"] [data-item] { position:absolute; top:0; left:0; right:0; height:64px; box-sizing:border-box; display:flex; align-items:center; justify-content:space-between; padding:10px 8px 10px 16px; background:var(--surface); border:1px solid var(--border); border-radius:8px; touch-action:pan-y; user-select:none; transition:transform 200ms ease; }
    [data-demo="drag-reorder"] [data-handle] { width:44px; height:44px; min-width:44px; min-height:44px; box-sizing:border-box; padding:0; flex-shrink:0; touch-action:none; cursor:grab; font-size:24px; }
    [data-demo="drag-reorder"] [data-lifted="true"] { z-index:1; box-shadow:0 8px 20px #0004; transition:none; }
    [data-demo="drag-reorder"][data-quality="rough"] [data-item] { touch-action:none; transition:none; cursor:move; }
    [data-demo="drag-reorder"] [aria-live] { min-height:3em; }
    @media (prefers-reduced-motion: reduce) { [data-demo="drag-reorder"] [data-item] { transition:none; } }
  </style><h2>買うもの</h2><p>${polished ? '右のつまみで順番を変えられます。キー操作は Space で持ち上げ、↑↓ で移動、Space で置く、Esc で戻す。' : '行を動かして順番を変えましょう。'}</p><ol data-list aria-label="買い物リスト"></ol>${polished ? '<p aria-live="polite" aria-atomic="true"></p>' : ''}`;
  const list = root.querySelector('[data-list]');
  let order = ['牛乳', '卵', 'パン', 'りんご', 'コーヒー'].map(name => {
    const row = document.createElement('li'); row.dataset.item = name;
    row.innerHTML = `<span>${name}</span>${polished ? `<button data-handle type="button" aria-label="${name}を並べ替える" aria-pressed="false">≡</button>` : ''}`;
    if (!polished) row.tabIndex = 0;
    list.append(row); return row;
  });
  let active, syncing = false;
  function render(heldY) {
    order.forEach((row, index) => {
      row.style.transform = `translateY(${row === active?.row && heldY !== undefined ? heldY : index * 64}px)`;
    });
  }
  function syncDOM() {
    syncing = true;
    for (const row of order) list.append(row);
    syncing = false;
  }
  function announce(message) { if (polished) root.querySelector('[aria-live]').textContent = message; }
  function lift(row, pointer) {
    active = { row, before: [...order], startIndex: order.indexOf(row), ...pointer };
    // 雑でも、動かしている行がほかの行の下に隠れないようにする。
    row.style.zIndex = '2';
    if (polished) {
      row.dataset.lifted = 'true'; row.querySelector('button').setAttribute('aria-pressed', 'true');
      announce(`${row.dataset.item}を持ち上げました`);
    }
  }
  function move(index) {
    const current = order.indexOf(active.row);
    const target = Math.max(0, Math.min(order.length - 1, index));
    if (current === target) return;
    order.splice(current, 1); order.splice(target, 0, active.row);
    announce(`${active.row.dataset.item}を${target + 1}番目に移動しました`);
  }
  function finish(cancel = false, focusTarget = active?.row.querySelector('button')) {
    if (!active) return;
    const held = active; active = undefined;
    if (cancel) order = held.before;
    held.row.removeAttribute('data-lifted'); held.row.style.zIndex = '';
    if (polished) held.row.querySelector('button').setAttribute('aria-pressed', 'false');
    // DOMを並べ替える前にキャプチャを解放する。ドラッグ中のDOM移動は避ける。
    if (held.target?.hasPointerCapture(held.id)) held.target.releasePointerCapture(held.id);
    syncDOM(); render();
    if (polished) {
      focusTarget?.focus({ preventScroll: true });
      announce(cancel ? '元の順番に戻しました' : `${held.row.dataset.item}を${order.indexOf(held.row) + 1}番目に移動しました`);
    }
  }
  root.addEventListener('pointerdown', event => {
    if (active || event.button !== 0 || !event.isPrimary) return;
    const target = event.target.closest(polished ? '[data-handle]' : '[data-item]');
    if (!target) return;
    event.preventDefault();
    if (polished) target.focus({ preventScroll: true });
    lift(target.closest('[data-item]'), { id: event.pointerId, y: event.clientY, target });
    target.setPointerCapture(event.pointerId);
  }, { signal: events.signal });
  root.addEventListener('pointermove', event => {
    if (!active || active.id !== event.pointerId) return;
    event.preventDefault();
    const y = Math.max(0, Math.min(256, active.startIndex * 64 + event.clientY - active.y));
    if (polished) { move(Math.round(y / 64)); render(y); }
    else active.row.style.transform = `translateY(${y}px)`;
  }, { signal: events.signal });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(type, event => {
    if (!active || active.id !== event.pointerId) return;
    if (!polished && type === 'pointerup') move(Math.round(Math.max(0, Math.min(256, active.startIndex * 64 + event.clientY - active.y)) / 64));
    finish(type !== 'pointerup');
  }, { signal: events.signal });
  if (polished) root.addEventListener('keydown', event => {
    const handle = event.target.closest('[data-handle]');
    if (!handle || event.isComposing || ![' ', 'ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.repeat && (event.key === ' ' || event.key === 'Escape')) return;
    if (event.key === 'Escape') { finish(true); return; }
    if (active?.id !== undefined) return;
    const row = handle.closest('[data-item]');
    if (event.key === ' ') { if (active) finish(); else lift(row); }
    else if (active?.row === row) {
      move(order.indexOf(row) + (event.key === 'ArrowDown' ? 1 : -1));
      syncDOM(); render(); handle.focus({ preventScroll: true });
    }
  }, { signal: events.signal });
  // フォーカスを別の場所へ移したら、持ち上げ中の状態を残さない。
  root.addEventListener('focusout', event => {
    if (!syncing && active && active.id === undefined && !active.row.contains(event.relatedTarget)) finish(false, event.relatedTarget);
  }, { signal: events.signal });
  viewport.style.touchAction = polished ? 'pan-y' : 'none'; render(); viewport.append(root);
  return { unmount() {
    events.abort();
    if (active?.target?.hasPointerCapture(active.id)) active.target.releasePointerCapture(active.id);
    active = undefined; viewport.style.touchAction = previousTouchAction; root.remove();
  } };
}
