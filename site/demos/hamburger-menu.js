import { containLinks, reducedMotion } from '../js/demo-kit.js';

let nextMenu = 0;

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'hamburger-menu';
  root.dataset.quality = quality;
  const panelId = `demo-menu-${++nextMenu}`;
  const pages = ['ホーム', '検索', 'お気に入り', '設定'];
  root.innerHTML = `<style>
    [data-demo="hamburger-menu"] { position:absolute; inset:0; overflow:hidden; }
    [data-demo="hamburger-menu"] header { height:68px; padding:12px; border-bottom:1px solid var(--border); }
    [data-demo="hamburger-menu"] [data-menu-toggle] { width:44px; height:44px; min-height:0; padding:0; line-height:1; }
    [data-demo="hamburger-menu"][data-quality="rough"] [data-menu-toggle] { width:28px; height:28px; }
    [data-demo="hamburger-menu"] [data-menu-content] { padding:20px; }
    [data-demo="hamburger-menu"] [data-menu-shade] { position:absolute; inset:68px 0 0; background:#0007; }
    [data-demo="hamburger-menu"] [data-menu-panel] { background:var(--surface); padding:12px 0; }
    [data-demo="hamburger-menu"][data-quality="polished"] [data-menu-panel] { position:absolute; top:68px; bottom:0; left:0; width:280px; max-width:100%; z-index:1; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; animation:demo-menu-enter 240ms ease-out; }
    [data-demo="hamburger-menu"] [data-menu-panel] a { display:block; padding:10px 16px; text-decoration:none; border-left:4px solid transparent; }
    [data-demo="hamburger-menu"][data-quality="polished"] [aria-current="page"] { font-weight:700; border-left-color:var(--accent); background:var(--accent-soft); }
    [data-demo="hamburger-menu"][data-quality="rough"] [data-menu-panel] { margin:0 12px; border:1px solid var(--border); max-height:calc(100% - 68px); overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; }
    @keyframes demo-menu-enter { from { transform:translateX(-100%); } to { transform:translateX(0); } }
  </style><header><button type="button" data-menu-toggle>☰</button></header>
  <div data-menu-shade hidden></div><nav data-menu-panel id="${panelId}" hidden>${pages.map((name, index) => `<a href="${index}">${name}</a>`).join('')}</nav>
  <div data-menu-content><h3>ホーム</h3><p>見たいページを選んでください。</p></div>`;
  const button = root.querySelector('[data-menu-toggle]');
  const panel = root.querySelector('[data-menu-panel]');
  const shade = root.querySelector('[data-menu-shade]');
  const content = root.querySelector('[data-menu-content]');
  const links = [...panel.querySelectorAll('a')];
  if (polished) {
    button.setAttribute('aria-label', 'メニュー');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', panelId);
    panel.setAttribute('aria-label', 'ページ一覧');
    links[0].setAttribute('aria-current', 'page');
    if (reducedMotion()) panel.style.animation = 'none';
  }
  function close() {
    panel.hidden = true; shade.hidden = true; content.inert = false;
    if (polished) { button.setAttribute('aria-expanded', 'false'); button.focus({ preventScroll: true }); }
  }
  button.addEventListener('click', () => {
    if (!panel.hidden) { close(); return; }
    panel.hidden = false;
    if (polished) {
      shade.hidden = false; content.inert = true;
      button.setAttribute('aria-expanded', 'true');
      links[0].focus({ preventScroll: true });
    }
  }, { signal: events.signal });
  containLinks(panel, href => {
    const index = Number(href);
    if (!Number.isInteger(index) || !pages[index]) return;
    content.querySelector('h3').textContent = pages[index];
    if (polished) {
      links.forEach((link, i) => { if (i === index) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
      close();
    }
  }, events.signal);
  if (polished) {
    shade.addEventListener('click', close, { signal: events.signal });
    document.addEventListener('keydown', event => {
      if (!panel.hidden && event.key === 'Escape') { event.preventDefault(); close(); }
    }, { signal: events.signal });
  }
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y';
  viewport.append(root);
  return { unmount() { events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
