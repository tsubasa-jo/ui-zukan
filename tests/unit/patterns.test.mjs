import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CATEGORIES } from '../../site/js/data/categories.js';
import { PATTERNS } from '../../site/js/data/patterns.js';

// 全21件がそろったら削除する（Task 7）。
const PLANNED_IDS = [
  'hamburger-menu', 'breadcrumb', 'tabs', 'bottom-navigation',
  'carousel', 'accordion', 'bottom-sheet', 'tooltip',
  'radio-button', 'checkbox', 'toggle-switch',
  'swipe-action', 'drag-reorder',
];

const nonempty = value => assert.ok(typeof value === 'string' && value.trim().length > 0);
test('段階1の3件がある', () => {
  assert.deepEqual(PATTERNS.filter(p => p.phase === 1).map(p => p.id).sort(), ['modal', 'pull-to-refresh', 'toast']);
});
test('id が重複しない', () => {
  assert.equal(new Set(PATTERNS.map(p => p.id)).size, PATTERNS.length);
});
test('すべての必須キーが決まった型で入っている', () => {
  for (const p of PATTERNS) {
    for (const key of ['id', 'category', 'nameJa', 'nameEn', 'summary']) nonempty(p[key]);
    assert.match(p.id, /^[a-z]+(?:-[a-z]+)*$/);
    for (const key of ['aliases', 'goodFor', 'badFor', 'frames', 'points']) assert.ok(Array.isArray(p[key]));
    p.aliases.forEach(nonempty);
    p.goodFor.forEach(nonempty);
    p.badFor.forEach(item => { nonempty(item.case); nonempty(item.instead); });
    p.points.forEach(item => { nonempty(item.title); nonempty(item.detail); });
    assert.equal(typeof p.prompts, 'object');
    assert.equal(typeof p.fromVideo, 'boolean');
    assert.ok([1, 2, 3].includes(p.phase));
  }
});
test('category が CATEGORIES にある', () => {
  for (const p of PATTERNS) assert.ok(CATEGORIES.some(c => c.id === p.category));
});
test('points は2〜4件、goodFor と badFor は1件以上', () => {
  for (const p of PATTERNS) {
    assert.ok(p.points.length >= 2 && p.points.length <= 4);
    assert.ok(p.goodFor.length >= 1 && p.badFor.length >= 1);
  }
});
test('frames は phone / pc だけで、1件以上', () => {
  for (const p of PATTERNS) {
    assert.ok(p.frames.length >= 1);
    assert.equal(new Set(p.frames).size, p.frames.length);
    p.frames.forEach(frame => assert.ok(['phone', 'pc'].includes(frame)));
  }
});
test('prompts の3つがすべて空でない', () => {
  for (const p of PATTERNS) for (const key of ['short', 'detailed', 'swiftui']) nonempty(p.prompts[key]);
});
test('confusedWith は1〜3件で、存在する別の id を指す', () => {
  const ids = new Set([...PATTERNS.map(p => p.id), ...PLANNED_IDS]);
  for (const p of PATTERNS) {
    assert.ok(Array.isArray(p.confusedWith), p.id);
    assert.ok(p.confusedWith.length >= 1 && p.confusedWith.length <= 3, p.id);
    for (const id of p.confusedWith) {
      assert.notEqual(id, p.id);
      assert.ok(ids.has(id), `${p.id}: ${id}`);
    }
  }
});
test('全件に見本ファイルがある', () => {
  for (const p of PATTERNS) assert.ok(existsSync(new URL(`../../site/demos/${p.id}.js`, import.meta.url)));
});
test('分類の10件が決まった順である', () => {
  assert.deepEqual(CATEGORIES, [
    { id: 'navigation', name: 'ナビゲーション' },
    { id: 'overlay', name: '表示・重ねる' },
    { id: 'input', name: '入力' },
    { id: 'data', name: '一覧・データ' },
    { id: 'feedback', name: '待ち・お知らせ' },
    { id: 'gesture', name: '指で操作する' },
    { id: 'layout', name: '画面の組み方' },
    { id: 'utility', name: '操作・便利機能' },
    { id: 'motion', name: '動き・演出' },
    { id: 'guide', name: '案内' },
  ]);
});
test('段階1の指定された分類・枠・文面を保つ', () => {
  const [toast, modal, pull] = ['toast', 'modal', 'pull-to-refresh'].map(id => PATTERNS.find(p => p.id === id));
  assert.equal(toast.category, 'feedback');
  assert.deepEqual(toast.frames, ['phone', 'pc']);
  assert.deepEqual(toast.aliases, ['スナックバー（取り消しボタン付きの近い部品）']);
  assert.equal(toast.prompts.short, '設定画面にトーストを出して');
  assert.equal(toast.prompts.detailed, '保存したら画面下にトーストを出して。3秒で消して、マウスを乗せている間は消さない。続けて出たら重ねずに入れ替える');
  assert.equal(modal.category, 'overlay');
  assert.deepEqual(modal.frames, ['pc', 'phone']);
  assert.ok(modal.badFor.some(item => item.case === '長い入力フォーム' && item.instead === '別ページにする'));
  assert.equal(pull.category, 'feedback');
  assert.deepEqual(pull.frames, ['phone']);
  for (const p of [toast, modal, pull]) { assert.equal(p.fromVideo, true); assert.equal(p.phase, 1); }
});
