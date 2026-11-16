import { reducedMotion } from '../js/demo-kit.js';

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'bottom-navigation';
  root.dataset.quality = quality;
  const names = ['ホーム', '検索', '通知', 'マイページ', 'お気に入り', '設定'];
  const icons = ['⌂', '⌕', '♧', '☺', '☆', '⚙'];
  const count = polished ? 4 : 6;
  root.innerHTML = `<style>
    [data-demo="bottom-navigation"] { position:absolute; inset:0; display:flex; flex-direction:column; overflow:hidden; }
    [data-demo="bottom-navigation"] [data-navigation-content] { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; padding:16px; }
    [data-demo="bottom-navigation"] ul { list-style:none; padding:0; margin:0; }
    [data-demo="bottom-navigation"] li { padding:20px 0; border-bottom:1px solid var(--border); }
    [data-demo="bottom-navigation"] nav { display:flex; flex-shrink:0; border-top:1px solid var(--border); background:var(--surface); }
    [data-demo="bottom-navigation"][data-quality="polished"] nav { padding-bottom:env(safe-area-inset-bottom); }
    [data-demo="bottom-navigation"] nav button { flex:1 1 0; min-width:0; min-height:49px; padding:4px 0; border:0; border-radius:0; font-size:11px; line-height:1.4; }
    [data-demo="bottom-navigation"] [data-icon] { display:block; font-size:20px; line-height:24px; }
    [data-demo="bottom-navigation"] [data-active="true"] { color:var(--accent); }
    [data-demo="bottom-navigation"][data-quality="polished"] [data-active="true"] { font-weight:700; }
    [data-demo="bottom-navigation"][data-quality="rough"] nav button { height:36px; min-height:0; padding:0; }
  </style><div data-navigation-content><h3>ホーム</h3><ul></ul></div><nav aria-label="主なページ">${names.slice(0, count).map((name, i) => `<button type="button"${polished ? ` aria-label="${name}"` : ''}><span data-icon aria-hidden="true">${icons[i]}</span>${polished ? `<span>${name}</span>` : ''}</button>`).join('')}</nav>`;
  const content = root.querySelector('[data-navigation-content]');
  const list = root.querySelector('ul');
  const buttons = [...root.querySelectorAll('nav button')];
  let current = 0;
  function render() {
    content.querySelector('h3').textContent = names[current];
    list.replaceChildren();
    for (let i = 1; i <= 24; i++) {
      const li = document.createElement('li'); li.textContent = `${names[current]}のお知らせ ${i}`; list.append(li);
    }
    buttons.forEach((button, i) => {
      button.dataset.active = String(i === current);
      if (polished && i === current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  buttons.forEach((button, i) => button.addEventListener('click', () => {
    if (current === i) {
      if (polished) content.scrollTo({ top: 0, behavior: reducedMotion() ? 'instant' : 'smooth' });
      return;
    }
    current = i; render(); content.scrollTop = 0;
  }, { signal: events.signal }));
  const previousTouchAction = viewport.style.touchAction;
  // 子の一覧への縦スワイプを、親の none で妨げないようにする。
  viewport.style.touchAction = 'pan-y';
  render(); viewport.append(root);
  return { unmount() { events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
