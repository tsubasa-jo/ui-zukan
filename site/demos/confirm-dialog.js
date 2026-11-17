let nextDialog = 0;

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'confirm-dialog'; root.dataset.quality = quality;
  const id = `demo-photo-confirm-${++nextDialog}`;
  root.innerHTML = `<style>
    [data-demo="confirm-dialog"] { position:absolute; inset:0; }
    [data-demo="confirm-dialog"] [data-gallery] { height:100%; box-sizing:border-box; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; padding:16px; }
    [data-demo="confirm-dialog"] h2 { margin:0 0 16px; font-size:1.2rem; }
    [data-demo="confirm-dialog"] button { min-height:44px; }
    [data-demo="confirm-dialog"] [aria-disabled="true"] { opacity:.6; }
    [data-demo="confirm-dialog"] [data-photo] { margin-top:16px; border:1px solid var(--border); border-radius:8px; overflow:hidden; }
    [data-demo="confirm-dialog"] [data-picture] { display:grid; place-items:center; height:96px; font-size:36px; background:linear-gradient(145deg,#d6e7df,#b1c9dd); color:#243247; }
    [data-demo="confirm-dialog"] [data-photo] p { margin:8px 12px; }
    [data-demo="confirm-dialog"] [data-curtain] { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:16px; background:#0007; touch-action:pan-y; }
    [data-demo="confirm-dialog"] [data-confirm] { width:100%; max-width:360px; box-sizing:border-box; max-height:100%; overflow-y:auto; overscroll-behavior:contain; background:var(--surface); color:var(--text); padding:20px; border-radius:12px; box-shadow:0 10px 30px #0004; }
    [data-demo="confirm-dialog"] [data-confirm] h3 { margin:0 0 12px; font-size:1.1rem; }
    [data-demo="confirm-dialog"] [data-actions] { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; margin-top:20px; }
    [data-demo="confirm-dialog"][data-quality="polished"] [data-delete] { background:#b42318; color:white; border-color:#b42318; }
  </style><section data-gallery><h2>保存した写真</h2><button type="button" data-open aria-label="旅行の写真を削除">旅行の写真を削除</button><p data-result role="status"></p><div data-photo="travel"><div data-picture aria-hidden="true">△</div><p>旅行の写真</p></div><div data-photo="garden"><div data-picture aria-hidden="true">♧</div><p>庭の写真</p></div><div data-photo="sea"><div data-picture aria-hidden="true">≈</div><p>海の写真</p></div></section>`;
  const gallery = root.querySelector('[data-gallery]');
  const opener = root.querySelector('[data-open]');
  let overlay;
  let dialogEvents;
  function close(restore = true) {
    dialogEvents?.abort(); dialogEvents = undefined;
    overlay?.remove(); overlay = undefined; gallery.inert = false;
    if (polished && restore) opener.focus({ preventScroll: true });
  }
  function open() {
    if (overlay || !root.querySelector('[data-photo="travel"]')) return;
    dialogEvents = new AbortController();
    overlay = document.createElement('div'); overlay.dataset.curtain = '';
    overlay.innerHTML = `<div data-confirm ${polished ? `role="alertdialog" aria-modal="true" aria-labelledby="${id}-title" aria-describedby="${id}-description"` : ''}><h3 id="${id}-title">${polished ? '『旅行の写真』を削除しますか？' : 'よろしいですか？'}</h3>${polished ? `<p id="${id}-description">削除すると元に戻せません。</p>` : ''}<div data-actions><button type="button" data-cancel>キャンセル</button><button type="button" data-delete>${polished ? '削除' : 'OK'}</button></div></div>`;
    const dialog = overlay.querySelector('[data-confirm]');
    const cancel = dialog.querySelector('[data-cancel]');
    const confirm = dialog.querySelector('[data-delete]');
    cancel.addEventListener('click', () => close(), { signal: dialogEvents.signal });
    confirm.addEventListener('click', () => {
      root.querySelector('[data-photo="travel"]').remove();
      root.querySelector('[data-result]').textContent = '旅行の写真を削除しました。';
      close();
      // 削除後も同じボタンへ戻れるように、フォーカス可能なまま操作だけを無効にする。
      opener.setAttribute('aria-disabled', 'true');
    }, { signal: dialogEvents.signal });
    root.append(overlay);
    if (polished) {
      gallery.inert = true;
      const buttons = [cancel, confirm];
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        else if (event.key === 'Tab') {
          event.preventDefault();
          const index = buttons.indexOf(document.activeElement);
          buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus({ preventScroll: true });
        }
      }, { signal: dialogEvents.signal });
      document.addEventListener('focusin', event => {
        if (!dialog.contains(event.target)) cancel.focus({ preventScroll: true });
      }, { signal: dialogEvents.signal });
    }
    (polished ? cancel : confirm).focus({ preventScroll: true });
  }
  opener.addEventListener('click', open, { signal: events.signal });
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y'; viewport.append(root);
  return { unmount() { close(false); events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
