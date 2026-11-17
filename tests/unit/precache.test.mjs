import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const site = new URL('../../site/', import.meta.url);

async function filesUnder(directory, prefix = './') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await filesUnder(new URL(`${entry.name}/`, directory), `${path}/`));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

test('precache.json に site/ の全ファイルが入っている', async () => {
  const { files } = JSON.parse(await readFile(new URL('./precache.json', site), 'utf8'));
  const expected = ['./', ...await filesUnder(site)]
    .filter(path => !['./sw.js', './precache.json'].includes(path)).sort();
  assert.deepEqual(files, expected);
  for (const path of files) assert.ok(path.startsWith('./'), path);
  for (const size of [180, 192, 512]) {
    const path = `./icons/icon-${size}.png`;
    assert.ok(files.includes(path), path);
    await access(new URL(path, site));
  }
});

test('site/ にルートから始まるパスが無い', async () => {
  const rootPath = /(?:\b(?:src|href)\s*=\s*["']\s*\/|\burl\(\s*["']?\s*\/|\bimport\s*\(\s*["']\/|\bfrom\s*["']\/|["'](?:start_url|scope|src)["']\s*:\s*["']\/)/;
  for (const path of await filesUnder(site)) {
    if (!/\.(?:html|css|js|webmanifest)$/.test(path)) continue;
    assert.doesNotMatch(await readFile(new URL(path, site), 'utf8'), rootPath, path);
  }
});

// ブラウザーが必要な API だけを置き換え、実際の sw.js のイベント処理を動かす。
async function workerHarness(fetch) {
  const origin = 'https://example.test';
  const base = `${origin}/ui-zukan/`;
  const entries = new Map();
  const names = new Map();
  const handlers = new Map();
  const key = request => new URL(typeof request === 'string' ? request : request.url, base).href;
  const cache = {
    async match(request) { return entries.get(key(request))?.clone(); },
    async put(request, response) { entries.set(key(request), response.clone()); },
    async addAll(paths) {
      for (const path of paths) await cache.put(path, new Response(path));
    },
  };
  let skipped = false, claimed = false;
  const caches = {
    async open(name) { names.set(name, cache); return cache; },
    async keys() { return [...names.keys()]; },
    async delete(name) { return names.delete(name); },
  };
  runInNewContext(await readFile(new URL('./sw.js', site), 'utf8'), {
    self: {
      location: { origin, href: `${base}sw.js` },
      addEventListener: (type, handler) => handlers.set(type, handler),
      skipWaiting: async () => { skipped = true; },
      clients: { claim: async () => { claimed = true; } },
    }, caches, fetch, URL, Response,
  });
  function dispatch(type, request) {
    const pending = [];
    let response;
    handlers.get(type)({
      request,
      waitUntil: promise => pending.push(promise),
      respondWith: promise => { response = promise; },
    });
    return { response, done: () => Promise.all(pending) };
  }
  return { base, cache, names, dispatch, get skipped() { return skipped; }, get claimed() { return claimed; } };
}

test('SW はサブパスの一覧を保存して有効化し、古いキャッシュを消す', async () => {
  const worker = await workerHarness(async path => {
    assert.equal(new URL(path, worker.base).href, `${worker.base}precache.json`);
    return Response.json({ files: ['./', './index.html', './demos/drag-reorder.js'] });
  });
  await worker.dispatch('install').done();
  assert.equal(worker.skipped, true);
  assert.equal(await (await worker.cache.match('./demos/drag-reorder.js')).text(), './demos/drag-reorder.js');
  assert.ok(worker.names.has('uiz-v1'));
  worker.names.set('uiz-old', {});
  await worker.dispatch('activate').done();
  assert.equal(worker.claimed, true);
  assert.deepEqual([...worker.names.keys()], ['uiz-v1']);
});

test('SW はキャッシュを先に返し、裏の更新と通信なしの失敗を処理する', async () => {
  let finish;
  let network = () => new Promise(resolve => { finish = resolve; });
  const worker = await workerHarness(request => network(request));
  const request = { url: `${worker.base}js/app.js`, method: 'GET', mode: 'cors' };
  await worker.cache.put(request, new Response('古い内容'));
  const event = worker.dispatch('fetch', request);
  assert.equal(await (await event.response).text(), '古い内容');
  finish(new Response('新しい内容'));
  await event.done();
  assert.equal(await (await worker.cache.match(request)).text(), '新しい内容');
  network = async () => { throw new TypeError('offline'); };
  const offline = worker.dispatch('fetch', request);
  assert.equal(await (await offline.response).text(), '新しい内容');
  await offline.done();
});

test('SW は未保存の GET を取得し、通信なしのナビゲーションには index.html を返す', async () => {
  let online = true;
  const worker = await workerHarness(async () => {
    if (!online) throw new TypeError('offline');
    return new Response('取得した内容');
  });
  const request = { url: `${worker.base}not-cached.js`, method: 'GET', mode: 'cors' };
  const first = worker.dispatch('fetch', request);
  assert.equal(await (await first.response).text(), '取得した内容');
  await first.done();
  assert.equal(await (await worker.cache.match(request)).text(), '取得した内容');
  await worker.cache.put('./index.html', new Response('図鑑の画面'));
  online = false;
  const navigation = worker.dispatch('fetch', { ...request, url: `${worker.base}unknown`, mode: 'navigate' });
  assert.equal(await (await navigation.response).text(), '図鑑の画面');
  await navigation.done();
  const missing = worker.dispatch('fetch', { ...request, url: `${worker.base}missing.js` });
  assert.equal((await missing.response).status, 503);
  await missing.done();
});

test('SW は他の出どころと GET 以外の通信を扱わない', async () => {
  const worker = await workerHarness(() => { throw new Error('呼ばれない'); });
  for (const request of [
    { url: 'https://other.test/a.js', method: 'GET' },
    { url: `${worker.base}save`, method: 'POST' },
  ]) assert.equal(worker.dispatch('fetch', request).response, undefined);
});
