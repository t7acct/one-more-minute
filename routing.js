/** Dependency-free routing, with edge weights in seconds. */
export class MinHeap {
  items = [];
  push(item) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= item[0]) break;
      a[i] = a[p]; i = p;
    }
    a[i] = item;
  }
  pop() {
    const a = this.items, first = a[0], last = a.pop();
    if (a.length) {
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let c = i * 2 + 1;
        if (c + 1 < a.length && a[c + 1][0] < a[c][0]) c++;
        if (last[0] <= a[c][0]) break;
        a[i] = a[c]; i = c;
      }
      a[i] = last;
    }
    return first;
  }
}

export function dijkstra(graph, source) {
  if (!graph.has(source)) throw new Error('Unknown starting point.');
  const distance = new Map([[source, 0]]), previous = new Map();
  const queue = new MinHeap(); queue.push([0, source]);
  while (queue.items.length) {
    const [cost, node] = queue.pop();
    if (cost !== distance.get(node)) continue;
    for (const [next, weight] of graph.get(node)) {
      if (!Number.isFinite(weight) || weight <= 0) throw new Error('Edges must have positive, finite weights.');
      const candidate = cost + weight;
      if (candidate < (distance.get(next) ?? Infinity)) {
        distance.set(next, candidate); previous.set(next, node);
        queue.push([candidate, next]);
      }
    }
  }
  return { source, distance, previous };
}

export function pathTo(tree, target) {
  if (!tree.distance.has(target)) return null;
  const path = [target];
  while (path.at(-1) !== tree.source) path.push(tree.previous.get(path.at(-1)));
  return path.reverse();
}

/**
 * Search split points using three shortest-path trees on an undirected graph.
 * Maximise shared walking time subject to each person's extra-time budget.
 * Reject repeated vertices. This candidate search is not a global longest-simple-path solver.
 */
export function planWalk(graph, start, destinationA, destinationB, extraMinutes = 0) {
  if (!Number.isFinite(extraMinutes) || extraMinutes < 0) throw new Error('Extra time must be non-negative.');
  const s = dijkstra(graph, start), a = dijkstra(graph, destinationA), b = dijkstra(graph, destinationB);
  const directA = s.distance.get(destinationA), directB = s.distance.get(destinationB);
  if (directA === undefined || directB === undefined) throw new Error('Choose destinations connected to the starting point.');
  let best = null;
  for (const [meeting, shared] of s.distance) {
    const timeA = shared + (a.distance.get(meeting) ?? Infinity);
    const timeB = shared + (b.distance.get(meeting) ?? Infinity);
    if (timeA > directA + extraMinutes * 60 + 1e-7 || timeB > directB + extraMinutes * 60 + 1e-7) continue;
    if (best && shared < best.shared - 1e-7) continue;
    const together = pathTo(s, meeting);
    const tailA = pathTo(a, meeting).reverse(), tailB = pathTo(b, meeting).reverse();
    const routeA = [...together, ...tailA.slice(1)], routeB = [...together, ...tailB.slice(1)];
    if (new Set(routeA).size !== routeA.length || new Set(routeB).size !== routeB.length) continue;
    // Count any common prefix after the proposed split too, so the displayed goodbye is honest.
    let i = 0;
    while (i < routeA.length && i < routeB.length && routeA[i] === routeB[i]) i++;
    const prefix = routeA.slice(0, i);
    let actualShared = 0;
    for (let j = 1; j < prefix.length; j++) actualShared += graph.get(prefix[j - 1]).get(prefix[j]);
    const candidate = { meeting: prefix.at(-1), shared: actualShared, together: prefix,
      tailA: routeA.slice(i - 1), tailB: routeB.slice(i - 1), routeA, routeB,
      timeA, timeB, directA, directB, extraA: Math.max(0, timeA - directA), extraB: Math.max(0, timeB - directB) };
    if (!best || actualShared > best.shared + 1e-7 ||
      (Math.abs(actualShared - best.shared) < 1e-7 && timeA + timeB < best.timeA + best.timeB)) best = candidate;
  }
  return best;
}

export function metresBetween(a, b) {
  const rad = Math.PI / 180, dlat = (b.lat - a.lat) * rad, dlon = (b.lon - a.lon) * rad;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function buildGraph(data) {
  const nodes = new Map(data.nodes.map(([id, lat, lon]) => [id, { id, lat, lon }]));
  const graph = new Map([...nodes.keys()].map(id => [id, new Map()]));
  for (const way of data.ways) for (let i = 1; i < way.nodes.length; i++) {
    const a = way.nodes[i - 1], b = way.nodes[i];
    if (!nodes.has(a) || !nodes.has(b) || a === b) continue;
    const seconds = metresBetween(nodes.get(a), nodes.get(b)) / 1.35;
    if (seconds <= 0) continue;
    graph.get(a).set(b, Math.min(seconds, graph.get(a).get(b) ?? Infinity));
    graph.get(b).set(a, Math.min(seconds, graph.get(b).get(a) ?? Infinity));
  }
  return { nodes, graph };
}

export function nearestNode(nodes, lat, lon, allowed = null) {
  let nearest = null, distance = Infinity;
  for (const [id, node] of nodes) {
    if (allowed && !allowed.has(id)) continue;
    const d = metresBetween(node, { lat, lon });
    if (d < distance) { nearest = id; distance = d; }
  }
  return nearest;
}
