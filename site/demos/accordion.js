import { reducedMotion } from '../js/demo-kit.js';

let nextAccordion = 0;

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'accordion'; root.dataset.quality = quality;
  const prefix = `demo-faq-${++nextAccordion}`;
  const questions = ['送料はいくらですか？', 'いつ届きますか？', '返品できますか？', '支払い方法は？'];
  const answers = ['送料は全国無料です。', '注文から3日ほどでお届けします。', '未使用の商品は到着から7日以内に返品できます。', 'クレジットカードと銀行振込が使えます。'];
  root.innerHTML = `<style>
    [data-demo="accordion"] { position:absolute; inset:0; padding:16px; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; }
    [data-demo="accordion"] section { border-bottom:1px solid var(--border); }
    [data-demo="accordion"] h3 { margin:0; font-size:14px; }
    [data-demo="accordion"] h3 button { width:100%; min-height:44px; display:flex; align-items:center; justify-content:space-between; text-align:left; border:0; border-radius:0; padding:10px 4px; }
    [data-demo="accordion"] [data-chevron] { font-size:24px; transform:rotate(0deg); transition:transform 200ms; }
    [data-demo="accordion"] [aria-expanded="true"] [data-chevron] { transform:rotate(90deg); }
    [data-demo="accordion"] [data-answer] { height:0; overflow:hidden; }
    [data-demo="accordion"] [data-answer] p { margin:0; padding:8px 4px 16px; font-size:14px; }
    [data-demo="accordion"] [data-question] { width:fit-content; cursor:pointer; margin:16px 0; font-size:14px; }
  </style><h2>よくある質問</h2>${questions.map((text, i) => `<section>${polished ? `<h3><button type="button" aria-expanded="false" aria-controls="${prefix}-${i}">${text}<span data-chevron aria-hidden="true">›</span></button></h3>` : `<div data-question>${text}</div>`}<div data-answer id="${prefix}-${i}" inert><p>${answers[i]}</p></div></section>`).join('')}`;
  const headings = [...root.querySelectorAll(polished ? 'h3 button' : '[data-question]')];
  const panels = [...root.querySelectorAll('[data-answer]')];
  const open = questions.map(() => false);
  const animate = polished && !reducedMotion();
  headings.forEach((heading, i) => {
    if (animate) panels[i].style.transition = 'height 200ms ease';
    heading.addEventListener('click', () => {
      open[i] = !open[i];
      panels[i].inert = !open[i];
      panels[i].style.height = open[i] ? `${panels[i].scrollHeight}px` : '0px';
      if (polished) heading.setAttribute('aria-expanded', String(open[i]));
    }, { signal: events.signal });
  });
  if (!animate) root.querySelectorAll('[data-chevron]').forEach(el => { el.style.transition = 'none'; });
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y';
  viewport.append(root);
  return { unmount() { events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
