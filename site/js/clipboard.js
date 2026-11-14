// 手動コピー用の入力欄は、次のコピー時に片付ける。
let manualArea;

function selectText(text, target) {
  manualArea?.remove();
  manualArea = undefined;
  if (target) {
    if (!target.isConnected) return;
    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    manualArea = document.createElement('textarea');
    manualArea.dataset.role = 'manual-copy';
    manualArea.setAttribute('aria-label', 'コピーする文章');
    manualArea.readOnly = true;
    manualArea.value = text;
    document.body.append(manualArea);
    manualArea.focus();
    manualArea.select();
  }
}

export async function copyText(text) {
  const target = [...document.querySelectorAll('[data-prompt-text]')]
    .find(element => element.textContent === text);
  manualArea?.remove();
  manualArea = undefined;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    }
  } catch {
    // LAN経由のHTTPや権限拒否では、従来の方法を試す。
  }
  // コピー待機中に元のカードを離れたら、古い文章の選択欄を出さない。
  if (target && !target.isConnected) return 'manual';
  const area = document.createElement('textarea');
  area.value = text;
  area.readOnly = true;
  area.tabIndex = -1;
  area.style.cssText = 'position:absolute;inset:0 auto auto 0;width:1px;height:1px;opacity:0;';
  area.setAttribute('aria-label', 'コピーする文章');
  const previousFocus = document.activeElement;
  document.body.append(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    // どちらも使えない場合は、読める文章を選択して残す。
  } finally {
    area.remove();
    previousFocus?.focus({ preventScroll: true });
  }
  if (copied) return 'fallback';
  selectText(text, target);
  return 'manual';
}
