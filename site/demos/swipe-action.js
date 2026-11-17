import { later } from '../js/demo-kit.js';

export function mount(viewport, { quality, frame }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const previousTouchAction = viewport.style.touchAction;
  const root = document.createElement('div');
  root.dataset.demo = 'swipe-action'; root.dataset.quality = quality;
  root.innerHTML = `<style>
    [data-demo="swipe-action"] { position:absolute; inset:0; overflow:hidden; }
    [data-demo="swipe-action"] [data-mailbox] { height:100%; box-sizing:border-box; overflow-y:auto; overscroll-behavior:contain; padding:16px 12px 112px; }
    [data-demo="swipe-action"] h2 { margin:0 0 16px; font-size:1.2rem; }
    [data-demo="swipe-action"] ul { list-style:none; padding:0; margin:0; }
    [data-demo="swipe-action"] [data-row] { position:relative; overflow:hidden; border-bottom:1px solid var(--border); }
    [data-demo="swipe-action"] [data-content] { position:relative; min-height:76px; box-sizing:border-box; padding:16px 12px; background:var(--surface); user-select:none; cursor:ew-resize; }
    [data-demo="swipe-action"] small { display:block; margin-top:6px; color:var(--muted); }
    [data-demo="swipe-action"] [data-delete] { position:absolute; inset:0 0 0 auto; width:80px; border:0; border-radius:0; background:#b42332; color:white; }
    [data-demo="swipe-action"] [data-notice] { position:absolute; bottom:16px; left:12px; right:12px; padding:12px; border-radius:8px; background:#243247; color:white; display:flex; align-items:center; gap:12px; justify-content:space-between; }
    [data-demo="swipe-action"] [data-notice][hidden] { display:none; }
    [data-demo="swipe-action"] [data-notice] button { min-height:44px; flex-shrink:0; }
    @media (prefers-reduced-motion: reduce) { [data-demo="swipe-action"] [data-content] { transition:none !important; } }
  </style><div data-mailbox><h2>受信したメール</h2><ul aria-label="メールの一覧"></ul></div><div data-notice hidden role="status"><span></span><button type="button">取り消す</button></div>`;
  const mailbox = root.querySelector('[data-mailbox]');
  const list = root.querySelector('ul');
  const notice = root.querySelector('[data-notice]');
  const undo = notice.querySelector('button');
  const rows = ['週末の予定', '注文の確認', '読書会のお誘い', '今月のお知らせ', '荷物の発送', '新刊のご案内', '予約の確認', '来週の天気'].map((subject, index) => {
    const row = document.createElement('li'); row.dataset.row = String(index); row.dataset.offset = '0';
    row.innerHTML = `<button data-delete type="button" disabled aria-label="${subject}を削除">削除</button><div data-content ${polished ? 'tabindex="0"' : ''}>${subject}<small>今日のメール</small></div>`;
    list.append(row); return row;
  });
  let drag, deleted, timer;
  let remaining = 6000, started = 0, hovering = false, focused = false, suppressClick = false;
  function offset(row, value, animate = true) {
    const amount = Math.round(Math.min(0, value));
    row.dataset.offset = String(amount);
    const content = row.querySelector('[data-content]');
    content.style.transition = polished && animate ? 'transform 200ms ease' : 'none';
    content.style.transform = `translateX(${amount}px)`;
    row.querySelector('[data-delete]').disabled = amount > -40;
  }
  function closeOthers(except) {
    if (polished) for (const row of rows) if (row !== except) offset(row, 0);
  }
  function stopTimer() {
    if (!timer) return;
    timer.abort(); timer = undefined;
    remaining = Math.max(0, remaining - (Date.now() - started));
  }
  function dismiss() { stopTimer(); notice.hidden = true; deleted = undefined; }
  function resume() {
    if (notice.hidden || hovering || focused || timer) return;
    started = Date.now(); timer = new AbortController();
    later(remaining, dismiss, timer.signal);
  }
  function remove(row) {
    const hadFocus = row.contains(document.activeElement);
    const next = row.nextElementSibling || row.previousElementSibling;
    offset(row, 0); row.remove();
    if (polished) {
      dismiss(); deleted = row; remaining = 6000;
      notice.querySelector('span').textContent = `「${row.querySelector('[data-content]').firstChild.textContent}」を削除しました`;
      notice.hidden = false; resume();
      if (hadFocus) {
        if (next) next.querySelector('[data-content]').focus({ preventScroll: true });
        else { root.querySelector('h2').tabIndex = -1; root.querySelector('h2').focus({ preventScroll: true }); }
      }
    }
  }
  undo.addEventListener('click', () => {
    if (!deleted) return;
    const row = deleted;
    const following = rows.slice(rows.indexOf(row) + 1).find(item => item.parentNode === list);
    list.insertBefore(row, following || null); dismiss();
    row.querySelector('[data-content]').focus({ preventScroll: true });
  }, { signal: events.signal });
  notice.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; stopTimer(); } }, { signal: events.signal });
  notice.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { hovering = false; resume(); } }, { signal: events.signal });
  notice.addEventListener('focusin', () => { focused = true; stopTimer(); }, { signal: events.signal });
  notice.addEventListener('focusout', event => { focused = notice.contains(event.relatedTarget); resume(); }, { signal: events.signal });
  root.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; return; }
    const button = event.target.closest('[data-delete]');
    if (button) remove(button.closest('[data-row]'));
  }, { signal: events.signal });
  root.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0 || !event.isPrimary) return;
    suppressClick = false;
    const row = event.target.closest('[data-row]');
    closeOthers(row);
    // 戻る途中の行の下に見えている、まだ押せない「削除」をつかんでも、行を引けるようにする。
    if (!row || event.target.closest('button:not(:disabled)')) return;
    const content = row.querySelector('[data-content]');
    drag = { id: event.pointerId, row, content, x: event.clientX, y: event.clientY, base: Number(row.dataset.offset), axis: polished ? undefined : 'x' };
    content.setPointerCapture(event.pointerId);
  }, { signal: events.signal });
  root.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    // 最初の動きで方向を固定し、縦スクロールから横操作へ切り替えない。
    if (!drag.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 6) drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (drag.axis !== 'x') return;
    suppressClick = Math.abs(dx) > 6;
    event.preventDefault();
    offset(drag.row, Math.max(-drag.row.clientWidth, drag.base + dx), false);
  }, { signal: events.signal });
  function finish(event) {
    if (drag?.id !== event.pointerId) return;
    const active = drag; drag = undefined;
    const amount = Number(active.row.dataset.offset);
    if (event.type !== 'pointerup') offset(active.row, active.base);
    else if (active.axis === 'x') {
      if (-amount >= active.row.clientWidth * 0.6) remove(active.row);
      else if (polished) offset(active.row, amount <= -40 ? -80 : 0);
    }
    if (active.content.hasPointerCapture(active.id)) active.content.releasePointerCapture(active.id);
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(type, finish, { signal: events.signal });
  if (polished) root.addEventListener('keydown', event => {
    const content = event.target.closest('[data-content]');
    if (!content || !['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) return;
    event.preventDefault(); const row = content.closest('[data-row]'); closeOthers(row);
    offset(row, event.key === 'ArrowLeft' ? -80 : 0);
  }, { signal: events.signal });
  mailbox.style.touchAction = polished ? 'pan-y' : 'none';
  viewport.style.touchAction = mailbox.style.touchAction; viewport.append(root);
  return { unmount() {
    events.abort(); stopTimer();
    if (drag?.content.hasPointerCapture(drag.id)) drag.content.releasePointerCapture(drag.id);
    drag = undefined; viewport.style.touchAction = previousTouchAction; root.remove();
  } };
}
