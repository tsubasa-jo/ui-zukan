import { copyText } from './clipboard.js';
import { createDemoHost } from './frame.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function renderProgressMarks(container, record) {
  container.replaceChildren();
  for (const [kind, symbol, label] of [['touched', '触', '触った'], ['named', '名', '名前を言えた']]) {
    if (!record[kind]) continue;
    const mark = element('span', '', 'progress-mark');
    mark.dataset.mark = kind;
    const visible = element('span', symbol);
    visible.setAttribute('aria-hidden', 'true');
    mark.append(visible, element('span', label, 'visually-hidden'));
    container.append(mark);
  }
}

export function renderCard(pattern, container, progress) {
  const events = new AbortController();
  const timers = new Set();
  let destroyed = false;
  const article = element('article', '', 'pattern-card');
  const back = element('a', '一覧へ戻る', 'back-link');
  back.href = '#/';
  article.append(back, element('h1', pattern.nameJa), element('p', pattern.nameEn, 'english-name'));
  const marks = element('div', '', 'progress-marks');
  article.append(marks);
  const updateMarks = () => renderProgressMarks(marks, progress.get(pattern.id));
  if (progress) updateMarks();
  const unsubscribe = progress?.subscribe(updateMarks);
  if (pattern.aliases.length) article.append(element('p', `別名：${pattern.aliases.join('、')}`, 'aliases'));
  article.append(element('h2', 'ひとことで言うと'), element('p', pattern.summary));
  const slot = element('div');
  slot.dataset.role = 'demo-slot';
  article.append(slot, element('h2', 'こだわりポイント'));
  const points = element('ul', '', 'points');
  for (const point of pattern.points) {
    const item = element('li');
    item.append(element('h3', point.title), element('p', point.detail));
    points.append(item);
  }
  article.append(points, element('h2', '向いている場面'));
  const good = element('ul');
  pattern.goodFor.forEach(text => good.append(element('li', text)));
  article.append(good, element('h2', '向かない場面'));
  const bad = element('ul');
  for (const item of pattern.badFor) bad.append(element('li', `${item.case} → ${item.instead}`));
  article.append(bad, element('h2', 'AIへの頼み方'));
  for (const [key, label] of [['short', '一言版'], ['detailed', 'こだわり版'], ['swiftui', 'SwiftUI版']]) {
    const section = element('section', '', 'prompt');
    section.dataset.role = `prompt-${key}`;
    const text = element('p', pattern.prompts[key]);
    text.dataset.promptText = key;
    const button = element('button', 'コピー');
    button.type = 'button';
    button.dataset.copy = key;
    button.setAttribute('aria-label', `${label}をコピー`);
    const status = element('span', '', 'copy-status');
    status.setAttribute('role', 'status');
    let timer;
    button.addEventListener('click', async () => {
      button.disabled = true;
      const result = await copyText(pattern.prompts[key]);
      if (destroyed) return;
      button.disabled = false;
      clearTimeout(timer);
      timers.delete(timer);
      status.textContent = result === 'manual' ? '長押しでコピーしてください' : 'コピーしました';
      timer = setTimeout(() => { status.textContent = ''; timers.delete(timer); }, 2000);
      timers.add(timer);
    }, { signal: events.signal });
    section.append(element('h3', label), text, button, status);
    article.append(section);
  }
  container.replaceChildren(article);
  const demoHost = createDemoHost(slot, pattern, { onInteract: () => progress?.mark(pattern.id, 'touched') });
  return {
    destroy() {
      destroyed = true;
      events.abort();
      unsubscribe?.();
      demoHost.destroy();
      timers.forEach(clearTimeout);
      article.remove();
    },
  };
}
