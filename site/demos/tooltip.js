import { later } from '../js/demo-kit.js';

let nextTooltip = 0;

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'tooltip'; root.dataset.quality = quality;
  const prefix = `demo-tip-${++nextTooltip}`;
  const labels = ['保存', '共有', '削除'];
  const descriptions = ['変更を保存', 'リンクを共有', '選択した項目を削除'];
  root.innerHTML = `<style>
    [data-demo="tooltip"] { position:absolute; inset:0; padding:16px; }
    [data-demo="tooltip"] [data-toolbar] { display:flex; gap:16px; margin-top:48px; }
    [data-demo="tooltip"] button { width:44px; height:44px; min-height:44px; padding:0; font-size:22px; }
    [data-demo="tooltip"] [data-tip] { position:absolute; z-index:2; max-width:calc(100% - 8px); padding:6px 10px; border-radius:6px; background:#243747; color:white; font-size:12px; line-height:1.5; overflow-wrap:anywhere; }
    [data-demo="tooltip"][data-quality="rough"] [data-tip] { pointer-events:none; }
  </style><h3>メモを編集</h3><div data-toolbar role="group" aria-label="編集操作">${['▣', '↗', '×'].map((icon, i) => `<button type="button" aria-label="${labels[i]}" ${polished ? `aria-describedby="${prefix}-${i}"` : ''}>${icon}</button>`).join('')}</div><p>今日のアイデアを書き留めます。</p>${descriptions.map((text, i) => `<div data-tip id="${prefix}-${i}" ${polished ? 'role="tooltip"' : ''} hidden>${text}</div>`).join('')}`;
  const buttons = [...root.querySelectorAll('button')];
  const tips = [...root.querySelectorAll('[data-tip]')];
  let showTimer, hideTimer, active = -1, hovered = -1, focused = -1, overTip = false;
  function cancelShow() { showTimer?.abort(); showTimer = undefined; }
  function cancelHide() { hideTimer?.abort(); hideTimer = undefined; }
  function hide() { cancelShow(); cancelHide(); tips.forEach(tip => { tip.hidden = true; }); active = -1; }
  events.signal.addEventListener('abort', () => { cancelShow(); cancelHide(); }, { once: true });
  function position(i) {
    const tip = tips[i], button = buttons[i];
    const bounds = root.getBoundingClientRect(), box = button.getBoundingClientRect();
    const width = tip.offsetWidth, height = tip.offsetHeight;
    const x = box.left - bounds.left + box.width / 2 - width / 2;
    let y = box.top - bounds.top + (polished ? -height - 8 : 8);
    if (polished && y < 4) y = box.bottom - bounds.top + 8;
    tip.style.left = `${Math.max(4, Math.min(x, bounds.width - width - 4))}px`;
    tip.style.top = `${Math.max(4, Math.min(y, bounds.height - height - 4))}px`;
  }
  function show(i) {
    hide(); active = i; tips[i].hidden = false; position(i);
  }
  function scheduleHide() {
    cancelShow(); cancelHide();
    if (!polished) { hide(); return; }
    if (focused === active || overTip || hovered === active) return;
    hideTimer = new AbortController(); later(100, hide, hideTimer.signal);
  }
  buttons.forEach((button, i) => {
    button.addEventListener('pointerenter', () => {
      hovered = i; cancelHide(); cancelShow();
      if (!polished || focused === i) { show(i); return; }
      if (active === i) return;
      showTimer = new AbortController(); later(500, () => show(i), showTimer.signal);
    }, { signal: events.signal });
    button.addEventListener('pointerleave', () => { hovered = -1; scheduleHide(); }, { signal: events.signal });
    if (polished) {
      button.addEventListener('focus', () => { focused = i; show(i); }, { signal: events.signal });
      button.addEventListener('blur', () => { focused = -1; hide(); }, { signal: events.signal });
      tips[i].addEventListener('pointerenter', () => { overTip = true; cancelHide(); }, { signal: events.signal });
      tips[i].addEventListener('pointerleave', () => { overTip = false; scheduleHide(); }, { signal: events.signal });
    }
  });
  if (polished) document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); hide(); }
  }, { signal: events.signal });
  // 枠の幅が変わったら、説明を表示領域内に置き直す。
  const resize = new ResizeObserver(() => { if (active >= 0) position(active); });
  viewport.append(root); resize.observe(root);
  return { unmount() { events.abort(); resize.disconnect(); root.remove(); } };
}
