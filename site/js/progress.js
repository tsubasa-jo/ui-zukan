const STORAGE_KEY = 'uiz-progress-v1';
const KINDS = ['touched', 'named', 'reversed'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function createProgressStore(storage) {
  const records = new Map();
  const subscribers = new Set();
  let raw;
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    raw = storage?.getItem(STORAGE_KEY);
  } catch {
    storage = null;
  }
  try {
    if (raw != null) {
      const data = JSON.parse(raw);
      if (!isRecord(data) || !Object.values(data).every(record =>
        isRecord(record) && Object.entries(record).every(([kind, value]) =>
          KINDS.includes(kind) && typeof value === 'boolean'))) {
        throw new SyntaxError('記録の形が不正です');
      }
      for (const [id, record] of Object.entries(data)) {
        records.set(id, Object.fromEntries(KINDS.filter(kind => record[kind] === true).map(kind => [kind, true])));
      }
    }
  } catch {
    records.clear();
    // 壊れたデータは次の記録で置き換える。
  }

  function get(id) {
    const record = records.get(id);
    return Object.fromEntries(KINDS.map(kind => [kind, record?.[kind] === true]));
  }

  return {
    get,
    mark(id, kind) {
      if (!KINDS.includes(kind) || get(id)[kind]) return;
      records.set(id, { ...records.get(id), [kind]: true });
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(records)));
      } catch {
        storage = null;
      }
      for (const fn of subscribers) fn();
    },
    count(ids) {
      return Object.fromEntries(KINDS.map(kind => [kind, ids.filter(id => get(id)[kind]).length]));
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
