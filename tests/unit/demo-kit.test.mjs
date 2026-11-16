import test from 'node:test';
import assert from 'node:assert/strict';
import { later, containLinks, reducedMotion } from '../../site/js/demo-kit.js';

test('later は指定時間後に一度だけ呼び、abort した処理は呼ばない', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const active = new AbortController();
  const cancelled = new AbortController();
  const alreadyCancelled = new AbortController();
  alreadyCancelled.abort();
  const calls = [];
  later(100, () => calls.push('active'), active.signal);
  later(100, () => calls.push('cancelled'), cancelled.signal);
  later(100, () => calls.push('alreadyCancelled'), alreadyCancelled.signal);
  t.mock.timers.tick(99);
  assert.deepEqual(calls, []);
  cancelled.abort();
  t.mock.timers.tick(1);
  assert.deepEqual(calls, ['active']);
  active.abort();
  t.mock.timers.tick(100);
  assert.deepEqual(calls, ['active']);
});

test('containLinks は子要素のクリックも止め、href を渡し、abort 後は解除する', () => {
  const root = new EventTarget();
  const signal = new AbortController();
  const link = { getAttribute: key => key === 'href' ? '#inside' : null };
  root.contains = node => node === link;
  const calls = [];
  containLinks(root, href => calls.push(href), signal.signal);
  function click(target) {
    const event = new Event('click', { cancelable: true });
    Object.defineProperty(event, 'target', { value: target });
    root.dispatchEvent(event);
    return event.defaultPrevented;
  }
  assert.equal(click({ closest: () => null }), false);
  assert.equal(click({ closest: () => ({}) }), false);
  assert.equal(click({ closest: () => link }), true);
  assert.deepEqual(calls, ['#inside']);
  signal.abort();
  assert.equal(click({ closest: () => link }), false);
  assert.deepEqual(calls, ['#inside']);
});

test('reducedMotion は利用者の設定を呼び出すたびに調べる', t => {
  let matches = true;
  const original = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'matchMedia', original);
    else delete globalThis.matchMedia;
  });
  globalThis.matchMedia = query => {
    assert.equal(query, '(prefers-reduced-motion: reduce)');
    return { matches };
  };
  assert.equal(reducedMotion(), true);
  matches = false;
  assert.equal(reducedMotion(), false);
});
