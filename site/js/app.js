import { CATEGORIES } from './data/categories.js';
import { PATTERNS } from './data/patterns.js';
import { renderCard, renderProgressMarks } from './card.js';
import { createProgressStore } from './progress.js';
import { renderQuiz } from './quiz-view.js';

const progress = createProgressStore();
const progressIds = PATTERNS.map(pattern => pattern.id);
const summary = document.createElement('p');
summary.dataset.role = 'progress-summary';
document.querySelector('.site-header').after(summary);
const listMarks = new Map();

// 本番のカードデータには、テスト用の見本を混ぜない。
const fixture = new URLSearchParams(location.search).get('fixture') === '1' ? {
  id: '_fixture', category: 'fixture', nameJa: 'テスト用の見本', nameEn: 'Fixture',
  aliases: [], summary: '見本の組み込みと取り外しを確かめます。',
  frames: ['phone', 'pc'], points: [], goodFor: [], badFor: [],
  prompts: { short: '見本を組み込んで', detailed: '切り替える前に古い見本を取り外して', swiftui: '画面を閉じたら見本を取り外して' },
  fromVideo: false, phase: 1,
} : null;
const patterns = fixture ? [...PATTERNS, fixture] : PATTERNS;
const categories = fixture ? [...CATEGORIES, { id: 'fixture', name: 'テスト' }] : CATEGORIES;
const app = document.querySelector('#app');
const list = document.createElement('nav');
list.dataset.role = 'pattern-list';
list.setAttribute('aria-label', '動きの一覧');
const panel = document.createElement('div');
panel.dataset.role = 'card-panel';
app.append(list, panel);
let currentCard;
let currentQuiz;
const screenLinks = document.querySelectorAll('[data-screen]');

for (const category of categories) {
  const itemsInCategory = patterns.filter(pattern => pattern.category === category.id);
  if (!itemsInCategory.length) continue;
  const group = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = category.name;
  const items = document.createElement('ul');
  for (const pattern of itemsInCategory) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#/p/${pattern.id}`;
    link.dataset.patternId = pattern.id;
    link.append(document.createTextNode(pattern.nameJa));
    const marks = document.createElement('span');
    marks.className = 'progress-marks';
    link.append(marks);
    listMarks.set(pattern.id, marks);
    if (pattern.fromVideo) {
      const badge = document.createElement('span');
      badge.className = 'video-badge';
      badge.textContent = '動画';
      link.append(badge);
    }
    item.append(link);
    items.append(item);
  }
  group.append(heading, items);
  list.append(group);
}

function updateProgress() {
  const counts = progress.count(progressIds);
  summary.textContent = `触った ${counts.touched} / ${PATTERNS.length} ・ 名前を言えた ${counts.named} / ${PATTERNS.length}`;
  for (const [id, marks] of listMarks) renderProgressMarks(marks, progress.get(id));
}
progress.subscribe(updateProgress);
updateProgress();

function route() {
  currentCard?.destroy();
  currentCard = undefined;
  currentQuiz?.destroy();
  currentQuiz = undefined;
  const isQuiz = location.hash === '#/quiz';
  for (const link of screenLinks) {
    if ((link.dataset.screen === 'quiz') === isQuiz) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const match = /^#\/p\/([^/]+)$/.exec(location.hash);
  const pattern = match && patterns.find(item => item.id === match[1]);
  for (const link of list.querySelectorAll('[data-pattern-id]')) {
    if (link.dataset.patternId === pattern?.id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  app.dataset.view = isQuiz ? 'quiz' : pattern ? 'card' : 'list';
  list.hidden = isQuiz;
  if (isQuiz) {
    currentQuiz = renderQuiz(panel, { patterns: PATTERNS, progress });
  } else if (pattern) {
    currentCard = renderCard(pattern, panel, progress);
  } else {
    if (location.hash !== '#/') history.replaceState(null, '', `${location.pathname}${location.search}#/`);
    const message = document.createElement('p');
    message.className = 'empty-card';
    message.textContent = '一覧から動きを選んでください。';
    panel.replaceChildren(message);
  }
}
window.addEventListener('hashchange', route);
route();
