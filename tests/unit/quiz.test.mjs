import test from 'node:test';
import assert from 'node:assert/strict';
import { pickRound, buildChoices } from '../../site/js/quiz.js';
import { PATTERNS } from '../../site/js/data/patterns.js';
import { createProgressStore } from '../../site/js/progress.js';

function sequence() {
  const values = [0.13, 0.87, 0.42, 0.65, 0.02];
  let index = 0;
  return () => values[index++ % values.length];
}
const ids = items => items.map(item => item.id);

test('pickRound は重複なく5件を返し、名前を言えたものを後回しにする', () => {
  const progress = createProgressStore(null);
  for (const item of PATTERNS.slice(2)) progress.mark(item.id, 'named');
  const original = ids(PATTERNS);
  const round = pickRound(PATTERNS, progress, sequence());
  assert.equal(round.length, 5);
  assert.equal(new Set(ids(round)).size, 5);
  assert.deepEqual(new Set(ids(round.slice(0, 2))), new Set(ids(PATTERNS.slice(0, 2))));
  assert.ok(round.slice(2).every(item => progress.get(item.id).named));
  assert.deepEqual(ids(PATTERNS), original);
  assert.equal(pickRound(PATTERNS, progress, sequence(), 3).length, 3);
  assert.equal(pickRound(PATTERNS, progress, sequence(), 0).length, 0);
  assert.deepEqual(pickRound([], progress, sequence()), []);
  assert.equal(pickRound(PATTERNS.slice(0, 2), progress, sequence()).length, 2);
  const fresh = createProgressStore(null);
  fresh.mark(PATTERNS[0].id, 'named');
  assert.ok(pickRound(PATTERNS, fresh, sequence()).every(item => !fresh.get(item.id).named));
});

test('buildChoices は正解を含む4件で、重複がない', () => {
  for (const answer of PATTERNS) {
    const original = JSON.stringify(PATTERNS);
    const choices = buildChoices(answer, PATTERNS, sequence());
    assert.equal(choices.length, 4);
    assert.equal(new Set(ids(choices)).size, 4);
    assert.equal(choices.filter(item => item.id === answer.id).length, 1);
    assert.equal(JSON.stringify(PATTERNS), original);
  }
  // 取り違え候補がなくても、同じ分類を先に、足りない分をほかの分類から取る。
  const answer = { id: 'a', category: 'one', confusedWith: ['missing', 'a'] };
  const same = { id: 'b', category: 'one' };
  const others = ['c', 'd', 'e'].map(id => ({ id, category: 'two' }));
  const choices = buildChoices(answer, [answer, same, ...others], sequence());
  assert.ok(choices.includes(same));
  assert.equal(choices.length, 4);
  assert.deepEqual(buildChoices(answer, [answer], sequence()), [answer]);
});

test('buildChoices は confusedWith を優先して入れる', () => {
  const toast = PATTERNS.find(item => item.id === 'toast');
  for (const rng of [sequence(), () => 0, () => 0.999]) {
    const choices = ids(buildChoices(toast, PATTERNS, rng));
    assert.ok(choices.includes('snackbar'));
    assert.ok(choices.includes('tooltip'));
    assert.ok(choices.includes('toast'));
  }
  const answer = { ...toast, confusedWith: ['toast', 'missing', 'snackbar', 'snackbar', 'tooltip', 'modal'] };
  const choices = ids(buildChoices(answer, PATTERNS, sequence()));
  assert.equal(new Set(choices).size, 4);
  assert.ok(choices.includes('snackbar'));
  assert.ok(choices.includes('tooltip'));
});

test('同じ rng なら同じ結果になる', () => {
  const progress = createProgressStore(null);
  assert.deepEqual(pickRound(PATTERNS, progress, sequence()), pickRound(PATTERNS, progress, sequence()));
  assert.deepEqual(buildChoices(PATTERNS[0], PATTERNS, sequence()), buildChoices(PATTERNS[0], PATTERNS, sequence()));
  assert.notDeepEqual(ids(pickRound(PATTERNS, progress, () => 0)), ids(pickRound(PATTERNS, progress, () => 0.999)));
});
