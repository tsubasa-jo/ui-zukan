import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressStore } from '../../site/js/progress.js';

const key = 'uiz-progress-v1';
const empty = { touched: false, named: false, reversed: false };
function fakeStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[key, initial]]);
  let saves = 0;
  return {
    getItem: name => data.get(name) ?? null,
    setItem(name, value) { saves++; data.set(name, value); },
    get saves() { return saves; },
  };
}

test('mark で記録され、作り直しても読み戻せる', () => {
  const storage = fakeStorage();
  const store = createProgressStore(storage);
  assert.deepEqual(store.get('toast'), empty);
  for (const kind of ['touched', 'named', 'reversed']) store.mark('toast', kind);
  store.mark('modal', 'touched');
  assert.deepEqual(JSON.parse(storage.getItem(key)), {
    toast: { touched: true, named: true, reversed: true }, modal: { touched: true },
  });
  assert.deepEqual(createProgressStore(storage).get('toast'), { touched: true, named: true, reversed: true });
  const snapshot = store.get('modal');
  snapshot.named = true;
  assert.equal(store.get('modal').named, false);
  // オブジェクトの組み込みプロパティと同じ id も安全に記録する。
  store.mark('__proto__', 'touched');
  assert.equal(createProgressStore(storage).get('__proto__').touched, true);
});

test('同じ印を2回付けても、保存と通知は1回', () => {
  const storage = fakeStorage();
  const store = createProgressStore(storage);
  let calls = 0;
  const unsubscribe = store.subscribe(() => { calls++; assert.equal(store.get('toast').touched, true); });
  store.mark('toast', 'touched');
  store.mark('toast', 'touched');
  assert.equal(storage.saves, 1);
  assert.equal(calls, 1);
  unsubscribe();
  store.mark('toast', 'named');
  assert.equal(calls, 1);
  assert.equal(storage.saves, 2);
});

test('storage の getItem が例外を投げても動き、記録はその場で持つ', t => {
  const storage = fakeStorage();
  storage.getItem = () => { throw new SyntaxError('利用不可'); };
  const store = createProgressStore(storage);
  store.mark('toast', 'touched');
  assert.equal(store.get('toast').touched, true);
  assert.equal(storage.saves, 0);
  const denied = fakeStorage();
  denied.setItem = () => { throw new Error('容量不足'); };
  const memory = createProgressStore(denied);
  let calls = 0;
  memory.subscribe(() => calls++);
  memory.mark('toast', 'named');
  assert.equal(memory.get('toast').named, true);
  assert.equal(calls, 1);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('利用不可'); } });
  for (const local of [createProgressStore(), createProgressStore(null)]) {
    local.mark('toast', 'touched');
    assert.equal(local.get('toast').touched, true);
  }
});

test('壊れた JSON や想定外の形が入っていても、空として扱う', () => {
  for (const raw of ['not json', '[]', '{"toast":"yes"}', 'null', '42',
    '{"toast":null}', '{"toast":{"touched":"true"}}', '{"toast":{"unknown":true}}',
    '{"modal":{"named":true},"toast":"yes"}']) {
    const storage = fakeStorage(raw);
    const store = createProgressStore(storage);
    assert.deepEqual(store.get('toast'), empty, raw);
    assert.deepEqual(store.get('modal'), empty, raw);
    assert.equal(storage.saves, 0);
    store.mark('toast', 'named');
    assert.deepEqual(JSON.parse(storage.getItem(key)), { toast: { named: true } });
  }
  const storage = fakeStorage('{"toast":{"touched":false,"named":true}}');
  const store = createProgressStore(storage);
  store.mark('modal', 'touched');
  assert.deepEqual(JSON.parse(storage.getItem(key)), { toast: { named: true }, modal: { touched: true } });
});

test('count は ids の中で印の付いた数を数える', () => {
  const store = createProgressStore(null);
  store.mark('toast', 'touched');
  store.mark('toast', 'named');
  store.mark('modal', 'touched');
  store.mark('outside', 'reversed');
  assert.deepEqual(store.count(['toast', 'modal', 'missing']), { touched: 2, named: 1, reversed: 0 });
  assert.deepEqual(store.count([]), { touched: 0, named: 0, reversed: 0 });
  assert.deepEqual(store.count(['outside']), { touched: 0, named: 0, reversed: 1 });
});
