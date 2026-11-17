import { pickRound, buildChoices } from './quiz.js';
import { createDemoHost } from './frame.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function renderQuiz(container, { patterns, progress, rng = Math.random }) {
  const root = element('section', '', 'quiz');
  root.setAttribute('aria-label', '名前当てクイズ');
  container.replaceChildren(root);
  let round;
  let index;
  let score;
  let hosts = [];
  let events;
  let questionObserver;
  let destroyed = false;

  function clearQuestion() {
    events?.abort();
    questionObserver?.disconnect();
    questionObserver = undefined;
    for (const host of hosts) host.destroy();
    hosts = [];
    root.replaceChildren();
    events = new AbortController();
  }

  function demo(parent, pattern) {
    const slot = element('div');
    parent.append(slot);
    hosts.push(createDemoHost(slot, pattern, { controls: false }));
  }

  function details(parent, pattern, label) {
    parent.dataset.comparisonItem = pattern.id;
    parent.append(element('p', label, 'quiz-comparison-label'), element('h2', pattern.nameJa),
      element('p', pattern.nameEn, 'english-name'), element('h3', 'ひとことで言うと'),
      element('p', pattern.summary));
    const link = element('a', 'カードを見る');
    link.href = `#/p/${pattern.id}`;
    parent.append(link);
  }

  function button(label, action) {
    const node = element('button', label);
    node.type = 'button';
    node.addEventListener('click', action, { signal: events.signal });
    return node;
  }

  function result() {
    clearQuestion();
    const heading = element('h1', `${round.length}問中${score}問正解`);
    heading.tabIndex = -1;
    const actions = element('div', '', 'quiz-actions');
    const back = element('a', '図鑑に戻る');
    back.href = '#/';
    actions.append(button('もう一度', start), back);
    root.append(heading, actions);
    heading.focus({ preventScroll: true });
  }

  function question(moveFocus = false) {
    clearQuestion();
    const answer = round[index];
    const counter = element('p', `${index + 1} / ${round.length}`, 'quiz-counter');
    counter.dataset.role = 'quiz-counter';
    counter.tabIndex = -1;
    // 正解側の見本は答えた後も同じ位置・幅を保つ。名前や判定は見本より下に置く。
    const samples = element('div', '', 'quiz-samples');
    const correctSample = element('section', '', 'quiz-sample');
    samples.append(correctSample);
    // 見本そのものは変更せず、出題中だけ読み上げ名から答えを伏せる。
    // パンくずなどが操作でDOMを作り直す場合も、同じ処理を適用する。
    const labelAttributes = ['aria-label', 'aria-roledescription', 'aria-description', 'title', 'alt'];
    const answerNames = [answer.nameJa, answer.nameEn, ...answer.aliases].map(name => name.toLowerCase());
    questionObserver = new MutationObserver(() => {
      for (const node of correctSample.querySelectorAll(labelAttributes.map(name => `[${name}]`).join(','))) {
        for (const attribute of labelAttributes) {
          const value = node.getAttribute(attribute);
          if (value && answerNames.some(name => value.toLowerCase().includes(name))) {
            node.setAttribute(attribute, attribute === 'aria-roledescription' ? '動き' : '見本の操作');
          }
        }
      }
    });
    questionObserver.observe(correctSample, { childList: true, subtree: true, attributes: true, attributeFilter: labelAttributes });
    const prompt = element('h1', 'この動きの名前は？');
    prompt.id = 'quiz-prompt';
    const choices = element('div', '', 'quiz-choices');
    choices.dataset.role = 'quiz-choices';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-labelledby', prompt.id);
    const feedback = element('p', '', 'quiz-feedback');
    feedback.dataset.role = 'quiz-feedback';
    feedback.setAttribute('role', 'status');
    const actions = element('div', '', 'quiz-actions');
    let answered = false;
    for (const choice of buildChoices(answer, patterns, rng)) {
      const option = button('', () => {
        if (destroyed || answered) return;
        answered = true;
        questionObserver.disconnect();
        for (const child of choices.children) child.disabled = true;
        if (choice.id === answer.id) {
          score++;
          progress.mark(answer.id, 'named');
          feedback.textContent = '正解';
        } else {
          feedback.textContent = `正解は${answer.nameJa}`;
          samples.dataset.role = 'quiz-comparison';
          samples.setAttribute('aria-label', '動きの見比べ');
          details(correctSample, answer, '正解の動き');
          const selectedSample = element('section', '', 'quiz-sample');
          samples.append(selectedSample);
          demo(selectedSample, choice);
          details(selectedSample, choice, '選んだ動き');
        }
        const next = button('次の問題', () => {
          index++;
          if (index === round.length) result();
          else question(true);
        });
        actions.append(next);
        // 無効になった選択肢から移す。見本の位置はスクロールで動かさない。
        next.focus({ preventScroll: true });
      });
      option.append(element('span', choice.nameJa), element('span', choice.nameEn, 'english-name'));
      choices.append(option);
    }
    root.append(counter, samples, prompt, choices, feedback, actions);
    demo(correctSample, answer);
    if (moveFocus) {
      counter.focus({ preventScroll: true });
      root.scrollIntoView({ block: 'start' });
    }
  }

  function start() {
    if (destroyed) return;
    round = pickRound(patterns, progress, rng);
    index = 0;
    score = 0;
    if (round.length) question(true);
    else result();
  }

  start();
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearQuestion();
      events.abort();
      root.remove();
    },
  };
}
