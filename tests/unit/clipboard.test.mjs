import test from 'node:test';
import assert from 'node:assert/strict';
import { copyText } from '../../site/js/clipboard.js';

test('コピー待機中に対象のカードを離れても手動コピー欄を残さない', async t => {
  // ブラウザのレイアウトではなく、非同期コピー後の要素の生存確認を検査する。
  const descriptors = Object.fromEntries(['document', 'navigator', 'window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const target = { textContent: '以前のカードの文章', isConnected: true };
  const attached = new Set();
  let rejectCopy;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    clipboard: { writeText: () => new Promise((resolve, reject) => { rejectCopy = reject; }) },
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    querySelectorAll: () => target.isConnected ? [target] : [],
    createElement: () => {
      const node = { dataset: {}, style: {}, setAttribute() {}, select() {}, focus() {}, remove() { attached.delete(node); } };
      return node;
    },
    body: { append: node => attached.add(node) },
    activeElement: { focus() {} },
    execCommand: () => false,
  } });
  const pending = copyText(target.textContent);
  target.isConnected = false;
  rejectCopy(new Error('権限が拒否された'));
  assert.equal(await pending, 'manual');
  assert.equal(attached.size, 0, '離れたカードの文章を手動コピー欄に残さない');
});
