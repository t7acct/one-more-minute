// Keep shared links readable, and keep old links working.
const defaults = { start: 'ucl', a: 'euston', b: 'russell', extra: 5, extraB: 5 };

function readBudget(value, fallback) {
  if (value === null || value.trim() === '') return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 10 ? number : fallback;
}

export function readWalk(hash, placeIds) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const state = { ...defaults };
  for (const key of ['start', 'a', 'b']) {
    if (placeIds.has(params.get(key))) state[key] = params.get(key);
  }
  state.extra = readBudget(params.get('extra'), 5);
  state.extraB = readBudget(params.get('extraB'), state.extra);
  return state;
}

export function walkHash(state) {
  return `#${new URLSearchParams({ start: state.start, a: state.a, b: state.b, extra: String(state.extra), extraB: String(state.extraB) })}`;
}
