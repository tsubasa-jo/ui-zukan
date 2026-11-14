let nextTitle = 0;

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'modal';
  root.innerHTML = `<style>
    [data-demo="modal"] { position:absolute; inset:0; }
    [data-modal-background] { height:100%; overflow-y:auto; overscroll-behavior:contain; padding:20px; touch-action:pan-y; }
    [data-backdrop] { position:absolute; inset:0; background:#0007; display:flex; align-items:center; justify-content:center; padding:16px; touch-action:pan-y; }
    [data-modal] { position:relative; max-width:360px; width:100%; max-height:100%; overflow:auto; overscroll-behavior:contain; touch-action:pan-y; background:var(--surface); color:var(--text); padding:20px; border-radius:12px; box-shadow:0 10px 30px #0004; }
    [data-modal] h2 { font-size:1.1rem; margin:12px 0; padding-right:24px; }
    [data-modal-actions] { display:flex; flex-wrap:wrap; gap:8px; margin-top:20px; }
    [data-modal] [data-action="close"] { position:absolute; right:4px; top:4px; }
  </style><div data-modal-background><button type="button" data-action="open">削除する</button><h3>保存したメモ</h3></div>`;
  const background = root.querySelector('[data-modal-background]');
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('p'); p.textContent = `メモ ${i + 1}：確認画面を開き、背景のスクロールやキーボードの動きを比べてください。`; background.append(p);
  }
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y';
  viewport.append(root);
  const opener = root.querySelector('[data-action="open"]');
  let overlay;
  let dialogEvents;
  const titleId = `demo-modal-title-${++nextTitle}`;
  function close(restore = true) {
    dialogEvents?.abort(); dialogEvents = undefined;
    overlay?.remove(); overlay = undefined;
    background.style.overflowY = 'auto'; background.inert = false;
    if (restore && polished) opener.focus({ preventScroll: true });
  }
  function open() {
    if (overlay) return;
    dialogEvents = new AbortController();
    overlay = document.createElement('div'); overlay.dataset.backdrop = '';
    overlay.innerHTML = `<div data-modal><h2 id="${titleId}">本当に削除しますか？</h2><p>このメモを削除します。</p><div data-modal-actions><button type="button">キャンセル</button><button type="button">削除</button></div></div>`;
    const modal = overlay.querySelector('[data-modal]');
    if (polished) {
      modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', titleId);
      const button = document.createElement('button'); button.type = 'button'; button.dataset.action = 'close'; button.textContent = '×'; button.setAttribute('aria-label', '閉じる'); modal.prepend(button);
      background.style.overflowY = 'hidden'; background.inert = true;
    } else {
      // 雑版は背景を操作できるままにして、違いを触って確かめられるようにする。
      overlay.style.pointerEvents = 'none'; modal.style.pointerEvents = 'auto';
    }
    root.append(overlay);
    const buttons = [...modal.querySelectorAll('button')];
    for (const button of buttons) button.addEventListener('click', () => close(), { signal: dialogEvents.signal });
    if (polished) {
      overlay.addEventListener('click', event => { if (event.target === overlay) close(); }, { signal: dialogEvents.signal });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        else if (event.key === 'Tab') {
          event.preventDefault();
          const index = buttons.indexOf(document.activeElement);
          buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus({ preventScroll: true });
        }
      }, { signal: dialogEvents.signal });
      document.addEventListener('focusin', event => {
        if (!modal.contains(event.target)) buttons[0].focus({ preventScroll: true });
      }, { signal: dialogEvents.signal });
    }
    buttons[0].focus({ preventScroll: true });
  }
  opener.addEventListener('click', open, { signal: events.signal });
  return { unmount() { close(false); events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
