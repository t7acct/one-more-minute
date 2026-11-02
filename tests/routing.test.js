import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGraph, dijkstra, pathTo, planWalk, nearestNode, MinHeap } from '../routing.js';
import { places } from '../places.js';

function makeGraph(edges) {
  const graph = new Map();
  for (const [a, b, w] of edges) {
    if (!graph.has(a)) graph.set(a, new Map());
    if (!graph.has(b)) graph.set(b, new Map());
    graph.get(a).set(b, w); graph.get(b).set(a, w);
  }
  return graph;
}
test('priority queue returns costs in ascending order', () => {
  const heap = new MinHeap();
  [7, 2, 9, 1, 3, 1, 8].forEach(n => heap.push([n, String(n)]));
  assert.deepEqual(Array.from({ length: 7 }, () => heap.pop()[0]), [1, 1, 2, 3, 7, 8, 9]);
});
test('shortest path updates a previously discovered longer route', () => {
  const graph = makeGraph([['s','a',10], ['s','b',1], ['b','a',1]]);
  const tree = dijkstra(graph, 's');
  assert.equal(tree.distance.get('a'), 2); assert.deepEqual(pathTo(tree, 'a'), ['s','b','a']);
  assert.equal(pathTo(tree, 'missing'), null);
});
test('extra time unlocks a longer shared walk; zero budget takes direct routes', () => {
  const graph = makeGraph([['s','m',60], ['m','a',60], ['m','b',60], ['s','a',90], ['s','b',90]]);
  const zero = planWalk(graph, 's','a','b',0), extra = planWalk(graph, 's','a','b',0.5);
  assert.equal(zero.shared,0); assert.equal(extra.shared,60);
  assert.equal(extra.extraA,30); assert.equal(extra.extraB,30);
});
test('walking out and back does not inflate time together', () => {
  const graph = makeGraph([['s','m',60], ['m','dead-end',300], ['m','a',60], ['m','b',60]]);
  const plan = planWalk(graph, 's','a','b',10);
  assert.equal(plan.shared,60);
  assert.equal(new Set(plan.routeA).size, plan.routeA.length);
  assert.equal(new Set(plan.routeB).size, plan.routeB.length);
});
test('same destination and starting at a destination work', () => {
  const graph = makeGraph([['s','m',60], ['m','a',60]]);
  assert.equal(planWalk(graph,'s','a','a',0).shared,120);
  assert.equal(planWalk(graph,'s','s','a',0).shared,0);
});
test('disconnected destinations and invalid budgets have useful failures', () => {
  const graph = makeGraph([['s','a',60], ['b','c',60]]);
  assert.throws(() => planWalk(graph,'s','a','b',0), /connected/);
  assert.throws(() => planWalk(graph,'s','a','a',-1), /non-negative/);
});

const data = JSON.parse(readFileSync(new URL('../data/bloomsbury.json', import.meta.url)));
const { graph, nodes } = buildGraph(data);
const origin = nearestNode(nodes, places[0].lat, places[0].lon);
const connected = dijkstra(graph, origin).distance;
const snapped = places.map(p => nearestNode(nodes,p.lat,p.lon,connected));
test('real Bloomsbury routes respect budgets, continuity, and avoid loops', () => {
  for (const [a,b] of [[1,3],[4,2],[9,7],[5,3],[0,0]]) {
    let shared = -1;
    for (const budget of [0,2,5,10]) {
      const p = planWalk(graph, snapped[0], snapped[a], snapped[b], budget);
      assert.ok(p); assert.ok(p.shared >= shared - 1e-7); shared = p.shared;
      assert.ok(p.extraA <= budget * 60 + 1e-7); assert.ok(p.extraB <= budget * 60 + 1e-7);
      for (const [route, target, time] of [[p.routeA,snapped[a],p.timeA],[p.routeB,snapped[b],p.timeB]]) {
        assert.equal(route[0], snapped[0]); assert.equal(route.at(-1), target);
        assert.equal(new Set(route).size,route.length);
        let cost = 0;
        for (let i=1;i<route.length;i++) { assert.ok(graph.get(route[i-1]).has(route[i])); cost += graph.get(route[i-1]).get(route[i]); }
        assert.ok(Math.abs(cost-time) < 1e-6);
      }
    }
  }
});
