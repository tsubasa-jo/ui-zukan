import { later } from '../js/demo-kit.js';

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const notices = new Set();
  let current;
  const root = document.createElement('div');
  root.dataset.demo = 'snackbar'; root.dataset.quality = quality;
  root.innerHTML = `<style>
    [data-demo="snackbar"] { position:absolute; inset:0; }
    [data-demo="snackbar"] [data-mailbox] { height:100%; box-sizing:border-box; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; padding:16px 16px 112px; }
    [data-demo="snackbar"] h2 { margin:0 0 16px; font-size:1.2rem; }
    [data-demo="snackbar"] ul { list-style:none; padding:0; margin:0; }
    [data-demo="snackbar"] [data-mail] { display:flex; gap:12px; justify-content:space-between; align-items:center; min-height:72px; border-bottom:1px solid var(--border); }
    [data-demo="snackbar"] [data-mail] span { min-width:0; }
    [data-demo="snackbar"] small { display:block; color:var(--muted); margin-top:4px; }
    [data-demo="snackbar"] button { flex-shrink:0; min-height:44px; }
    [data-demo="snackbar"] [data-stack] { position:absolute; left:16px; right:16px; bottom:16px; display:grid; gap:8px; }
    [data-demo="snackbar"] [data-notice] { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px; border-radius:8px; background:#243247; color:white; box-shadow:0 4px 16px #0003; }
    [data-demo="snackbar"] [data-notice] button { color:#fff; background:transparent; border:1px solid #9cb3d5; white-space:nowrap; }
  </style><div data-mailbox><h2>受信したメール</h2><ul aria-label="メールの一覧"></ul></div><div data-stack></div>`;
  const list = root.querySelector('ul');
  const stack = root.querySelector('[data-stack]');
  const mails = ['週末の予定', '注文の確認', '読書会のお誘い', '今月のお知らせ'].map((subject, index) => {
    const row = document.createElement('li'); row.dataset.mail = String(index);
    row.innerHTML = `<span>${subject}<small>今日のメール</small></span><button type="button">削除</button>`;
    list.append(row); return row;
  });
  // 元の順序を保持し、直前の削除で行番号が変わっても同じ場所へ戻す。
  function restore(row) {
    const following = mails.slice(mails.indexOf(row) + 1).find(mail => mail.parentNode === list);
    list.insertBefore(row, following || null);
  }
  function show(row) {
    if (polished) current?.dispose();
    const node = document.createElement('div'); node.dataset.notice = '';
    const text = document.createElement('span');
    text.textContent = `「${row.querySelector('span').firstChild.textContent}」を削除しました`;
    node.append(text);
    const local = new AbortController();
    let timer;
    let remaining = polished ? 6000 : 1500;
    let started;
    let hovering = false;
    let focused = false;
    const notice = { dispose };
    function stop() {
      if (!timer) return;
      timer.abort(); timer = undefined;
      remaining = Math.max(0, remaining - (Date.now() - started));
    }
    function dispose() {
      stop(); local.abort(); node.remove(); notices.delete(notice);
      if (current === notice) current = undefined;
    }
    function resume() {
      if (hovering || focused || timer) return;
      started = Date.now(); timer = new AbortController();
      later(remaining, dispose, timer.signal);
    }
    if (polished) {
      node.setAttribute('role', 'status');
      const undo = document.createElement('button'); undo.type = 'button'; undo.textContent = '取り消す'; node.append(undo);
      undo.addEventListener('click', () => {
        restore(row); dispose(); row.querySelector('button').focus({ preventScroll: true });
      }, { signal: local.signal });
      // タッチの pointerenter は、指を離した後の待ち時間を止めない。
      node.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        hovering = true; stop();
      }, { signal: local.signal });
      node.addEventListener('pointerleave', event => {
        if (event.pointerType !== 'mouse') return;
        hovering = false; resume();
      }, { signal: local.signal });
      node.addEventListener('focusin', () => { focused = true; stop(); }, { signal: local.signal });
      node.addEventListener('focusout', event => {
        focused = node.contains(event.relatedTarget); resume();
      }, { signal: local.signal });
    }
    stack.append(node); notices.add(notice); current = notice; resume();
  }
  for (const row of mails) row.querySelector('button').addEventListener('click', () => {
    const hadFocus = row.contains(document.activeElement);
    const next = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    // 取り消しへ勝手にフォーカスを移すと時間が止まるため、一覧の操作を続けられる場所へ戻す。
    if (polished && hadFocus) {
      if (next) next.querySelector('button').focus({ preventScroll: true });
      else { const heading = root.querySelector('h2'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
    show(row);
  }, { signal: events.signal });
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y'; viewport.append(root);
  return { unmount() { for (const notice of notices) notice.dispose(); events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
