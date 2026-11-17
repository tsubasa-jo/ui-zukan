import { PREFECTURES } from './data/prefectures.js';

let nextAutocomplete = 0;

export function mount(viewport, { quality }) {
  const polished = quality === 'polished';
  const events = new AbortController();
  const root = document.createElement('div');
  root.dataset.demo = 'autocomplete'; root.dataset.quality = quality;
  const id = `demo-address-${++nextAutocomplete}`;
  root.innerHTML = `<style>
    [data-demo="autocomplete"] { position:absolute; inset:0; padding:16px; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; }
    [data-demo="autocomplete"] label { display:block; margin-bottom:8px; }
    [data-demo="autocomplete"] input { box-sizing:border-box; width:100%; min-height:44px; padding:8px; font:inherit; font-size:16px; color:var(--text); background:var(--surface); border:1px solid var(--border); border-radius:8px; }
    [data-demo="autocomplete"] ul { list-style:none; padding:0; margin:4px 0 0; border:1px solid var(--border); background:var(--surface); }
    [data-demo="autocomplete"] li { padding:6px 10px; cursor:pointer; }
    [data-demo="autocomplete"][data-quality="polished"] li { box-sizing:border-box; min-height:44px; border-bottom:1px solid var(--border); }
    [data-demo="autocomplete"] li:hover, [data-demo="autocomplete"] [aria-selected="true"] { background:var(--accent-soft); }
    [data-demo="autocomplete"] [aria-selected="true"] { outline:2px solid var(--accent); outline-offset:-2px; }
    [data-demo="autocomplete"] small { display:block; color:var(--muted); }
    [data-demo="autocomplete"] mark { font-weight:bold; color:inherit; background:var(--accent-soft); }
    [data-demo="autocomplete"] [data-status] { color:var(--muted); }
  </style><h2>お届けの設定</h2><label for="${id}">都道府県</label><input id="${id}" type="text" autocomplete="off" placeholder="漢字・ひらがなで入力" ${polished ? `role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list"` : ''}><ul id="${id}-list" hidden ${polished ? 'role="listbox" aria-label="都道府県の候補"' : ''}></ul>${polished ? '<p data-status role="status" aria-live="polite"></p>' : ''}`;
  const input = root.querySelector('input');
  const list = root.querySelector('ul');
  const status = root.querySelector('[data-status]');
  let candidates = [];
  let active = -1;
  let timer;
  function cancelSearch() { clearTimeout(timer); timer = undefined; }
  function close() {
    cancelSearch(); list.hidden = true; active = -1;
    if (polished) {
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      for (const option of list.children) option.setAttribute('aria-selected', 'false');
      status.textContent = '';
    }
  }
  // 入力をHTMLとして扱わず、名前と読みの一致部分をそれぞれ示す。
  function appendHighlighted(parent, text, query) {
    let start = 0;
    let match = text.indexOf(query);
    while (query && match !== -1) {
      parent.append(document.createTextNode(text.slice(start, match)));
      const mark = document.createElement('mark');
      mark.textContent = query; parent.append(mark);
      start = match + query.length; match = text.indexOf(query, start);
    }
    parent.append(document.createTextNode(text.slice(start)));
  }
  function search() {
    timer = undefined;
    const query = input.value.trim();
    list.replaceChildren(); candidates = []; active = -1;
    if (!query) { close(); return; }
    const matches = PREFECTURES.filter(p => p.name.includes(query) || p.kana.includes(query));
    const starts = p => p.name.startsWith(query) || p.kana.startsWith(query);
    candidates = [...matches.filter(starts), ...matches.filter(p => !starts(p))];
    if (polished) candidates = candidates.slice(0, 6);
    candidates.forEach(({ name, kana }, index) => {
      const option = document.createElement('li');
      option.dataset.index = String(index);
      if (polished) {
        option.id = `${id}-option-${index}`; option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        appendHighlighted(option, name, query);
        const reading = document.createElement('small');
        appendHighlighted(reading, kana, query); option.append(reading);
      } else option.textContent = name;
      list.append(option);
    });
    list.hidden = candidates.length === 0;
    if (polished) {
      input.setAttribute('aria-expanded', String(!list.hidden));
      input.removeAttribute('aria-activedescendant');
      status.textContent = candidates.length ? '' : '該当する都道府県がありません';
    }
  }
  function schedule() {
    if (!polished) { search(); return; }
    // 打っている間は前の候補を出したままにし、選択中の印だけ外す（打つたびに一覧が消えてちらつかないように）。
    cancelSearch(); active = -1;
    input.removeAttribute('aria-activedescendant');
    for (const option of list.children) option.setAttribute('aria-selected', 'false');
    timer = setTimeout(search, 150);
  }
  function select(index) {
    if (!candidates[index]) return;
    input.value = candidates[index].name; close();
    input.focus({ preventScroll: true });
  }
  input.addEventListener('input', schedule, { signal: events.signal });
  input.addEventListener('keydown', event => {
    if (polished && event.isComposing) return;
    if (polished && event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (list.hidden || !candidates.length) return;
    if (polished && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      active = active < 0 ? (event.key === 'ArrowDown' ? 0 : candidates.length - 1)
        : (active + (event.key === 'ArrowDown' ? 1 : -1) + candidates.length) % candidates.length;
      [...list.children].forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
      const option = list.children[active];
      input.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && (!polished || active >= 0)) {
      event.preventDefault(); select(polished ? active : 0);
    }
  }, { signal: events.signal });
  list.addEventListener('pointerdown', event => {
    // マウス操作中も入力欄にフォーカスを保つ。タッチのスクロールは妨げない。
    if (polished && event.pointerType === 'mouse') event.preventDefault();
  }, { signal: events.signal });
  list.addEventListener('click', event => {
    const option = event.target.closest('li[data-index]');
    if (option) select(Number(option.dataset.index));
  }, { signal: events.signal });
  if (polished) {
    document.addEventListener('pointerdown', event => {
      if (!input.contains(event.target) && !list.contains(event.target)) close();
    }, { signal: events.signal });
    document.addEventListener('focusin', event => {
      if (event.target !== input && !list.contains(event.target)) close();
    }, { signal: events.signal });
  }
  const previousTouchAction = viewport.style.touchAction;
  viewport.style.touchAction = 'pan-y';
  viewport.append(root);
  return { unmount() { cancelSearch(); events.abort(); viewport.style.touchAction = previousTouchAction; root.remove(); } };
}
