// 元の配列とカードデータを変えずに、Fisher–Yates 法で並べ替える。
function shuffle(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function pickRound(patterns, progress, rng, count = 5) {
  const unique = [...new Map(patterns.map(pattern => [pattern.id, pattern])).values()];
  const unnamed = unique.filter(pattern => !progress.get(pattern.id).named);
  const named = unique.filter(pattern => progress.get(pattern.id).named);
  return [...shuffle(unnamed, rng), ...shuffle(named, rng)].slice(0, Math.max(0, count));
}

export function buildChoices(answer, patterns, rng) {
  const choices = new Map([[answer.id, answer]]);
  const byId = new Map(patterns.map(pattern => [pattern.id, pattern]));
  const confused = [...new Set(answer.confusedWith ?? [])]
    .filter(id => id !== answer.id && byId.has(id));
  for (const id of shuffle(confused, rng).slice(0, 2)) choices.set(id, byId.get(id));
  for (const sameCategory of [true, false]) {
    const candidates = [...byId.values()].filter(pattern => !choices.has(pattern.id)
      && (pattern.category === answer.category) === sameCategory);
    for (const pattern of shuffle(candidates, rng)) {
      if (choices.size === 4) break;
      choices.set(pattern.id, pattern);
    }
  }
  return shuffle([...choices.values()], rng);
}
