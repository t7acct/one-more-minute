import { buildGraph, dijkstra, nearestNode, planWalk } from './routing.js';
import { places } from './places.js';
import { readWalk, walkHash } from './walk-state.js';
import { setupMapControls } from './map-controls.js';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attributes, text) => {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
};
const project = n => [(n.lon + 0.149) * 1000 / 0.036, (51.535 - n.lat) * 900 / 0.021];
let data, nodes, graph, connected, snapped, lastResult;
let lastKey, baseline, cache = new Map();
const mins = seconds => (seconds / 60).toFixed(1).replace(/\.0$/, '');
const polyline = path => path.map(id => project(nodes.get(id)).join(',')).join(' ');

function paintBase() {
  const streets = document.createDocumentFragment();
  for (const way of data.ways) {
    const path = way.nodes.filter(id => nodes.has(id));
    const major = ['primary', 'secondary', 'tertiary'].includes(way.kind);
    streets.append(el('polyline', { points: polyline(path), fill: 'none', stroke: major ? '#fcfcf7' : '#f8faf4', 'stroke-width': major ? 5 : 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }
  $('streets').append(streets);
  const labels = [
    ['Bloomsbury', 51.5217, -0.1278, 19], ['Fitzrovia', 51.5205, -0.1402, 17],
    ['King’s Cross', 51.5320, -0.1235, 17], ['Euston', 51.5296, -0.1350, 17],
    ['Russell Square', 51.5222, -0.1273, 11], ['Gordon Square', 51.5244, -0.1315, 10],
    ['Tavistock Square', 51.5254, -0.1290, 10], ['Regent’s Park', 51.5300, -0.1460, 17]
  ];
  for (const [name, lat, lon, size] of labels) {
    const [x, y] = project({ lat, lon });
    $('labels').append(el('text', { x, y, 'font-size': size, 'text-anchor': 'middle' }, name));
  }
}

function line(path, className) {
  if (path.length < 2) return;
  $('routes').append(el('polyline', { points: polyline(path), class: 'route route-halo' }));
  $('routes').append(el('polyline', { points: polyline(path), class: `route ${className}` }));
}

function pin(id, text, colour, dx = 12, dy = -12) {
  const [x, y] = project(nodes.get(id));
  const group = el('g', {});
  group.append(el('circle', { cx: x, cy: y, r: 7, fill: colour, stroke: '#fcfcf7', 'stroke-width': 3 }));
  const label = el('text', { x: x + dx, y: y + dy, 'font-size': 12, 'font-weight': 650, 'text-anchor': dx < 0 ? 'end' : 'start', style: `fill:${colour};stroke:#fcfcf7;stroke-width:5px` }, text);
  group.append(label); $('markers').append(group);
}

function fitRoute() {
  if (!lastResult) return;
  const coords = [...lastResult.routeA, ...lastResult.routeB].map(id => project(nodes.get(id)));
  const xs = coords.map(p => p[0]), ys = coords.map(p => p[1]);
  const minX = Math.min(...xs) - 100, minY = Math.min(...ys) - 110;
  const width = Math.max(360, Math.max(...xs) - minX + 130), height = Math.max(360, Math.max(...ys) - minY + 110);
  $('map').setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
}

function render() {
  $('share-status').textContent = '';
  $('manual-share').hidden = true;
  $('share').disabled = true;
  const start = snapped.get($('start').value), a = snapped.get($('a').value), b = snapped.get($('b').value);
  const extra = Number($('budget').value);
  const extraB = Number($('budget-b').value);
  $('budget-label').value = `${extra} min extra`;
  $('budget-b-label').value = `${extraB} min extra`;
  const budgetKey = `${extra}/${extraB}`;
  const key = `${start}/${a}/${b}`;
  try {
    if (key !== lastKey) { cache = new Map(); baseline = planWalk(graph, start, a, b, 0); lastKey = key; }
    if (!cache.has(budgetKey)) cache.set(budgetKey, planWalk(graph, start, a, b, extra, extraB));
    const result = cache.get(budgetKey);
    if (!result) throw new Error('No route found. Try another pair of destinations.');
    lastResult = result;
    $('routes').replaceChildren(); $('markers').replaceChildren();
    line(result.tailA, 'route-a'); line(result.tailB, 'route-b'); line(result.together, 'route-shared');
    pin(start, 'Start', '#244d46', -12, 24);
    pin(a, 'You', '#ad4e29', -12, -12); pin(b, 'Your friend', '#3c59a3', 12, 22);
    pin(result.meeting, 'See you soon', '#24634e', 12, -14);
    const streets = data.ways.filter(w => w.name && w.nodes.includes(result.meeting));
    $('goodbye').textContent = result.meeting === start ? 'Split at the start. Try adding a little extra time.' : `Say goodbye ${streets[0] ? `near ${streets[0].name}` : 'at the marked junction'}.`;
    $('shared').textContent = mins(result.shared);
    $('time-a').textContent = `${mins(result.timeA)} min total`;
    $('time-b').textContent = `${mins(result.timeB)} min total`;
    $('extra-a').textContent = `${mins(result.extraA)} min extra walking`;
    $('extra-b').textContent = `${mins(result.extraB)} min extra walking`;
    const gain = Math.max(0, result.shared - (baseline?.shared ?? 0));
    $('gain').textContent = gain > 1 ? `${mins(gain)} more minutes together than going straight home.` : 'No extra time together with these limits. Try another pair or add a minute.';
    $('map-desc').textContent = `${mins(result.shared)} minutes together. Your journey: ${mins(result.timeA)} minutes; your friend’s: ${mins(result.timeB)} minutes. ${$('goodbye').textContent}`;
    $('status').hidden = true; $('result').hidden = false;
    history.replaceState(null, '', walkHash({ start: $('start').value, a: $('a').value, b: $('b').value, extra, extraB }));
    $('share').disabled = false;
    fitRoute();
  } catch (error) {
    $('result').hidden = true; $('status').hidden = false; $('status').textContent = error.message;
    $('routes').replaceChildren(); $('markers').replaceChildren(); lastResult = null;
  }
}

async function init() {
  try {
    const response = await fetch('./data/bloomsbury.json');
    if (!response.ok) throw new Error('Street data could not load. Refresh to try again.');
    data = await response.json(); ({ nodes, graph } = buildGraph(data));
    const origin = nearestNode(nodes, places[0].lat, places[0].lon);
    connected = dijkstra(graph, origin).distance;
    snapped = new Map(places.map(p => [p.id, nearestNode(nodes, p.lat, p.lon, connected)]));
    paintBase();
    for (const id of ['start', 'a', 'b']) for (const p of places) {
      const option = document.createElement('option'); option.value = p.id; option.textContent = p.name;
      $(id).append(option);
    }
    function restoreWalk() {
      const state = readWalk(location.hash, new Set(snapped.keys()));
      for (const id of ['start', 'a', 'b']) $(id).value = state[id];
      $('budget').value = state.extra; $('budget-b').value = state.extraB;
    }
    restoreWalk();
    window.addEventListener('hashchange', () => { restoreWalk(); render(); });
    for (const id of ['start', 'a', 'b']) {
      $(id).disabled = false; $(id).addEventListener('change', render);
    }
    for (const id of ['budget', 'budget-b']) $(id).disabled = false;
    $('example').disabled = false;
    $('swap').disabled = false;
    $('swap').addEventListener('click', () => {
      const destination = $('a').value;
      $('a').value = $('b').value; $('b').value = destination;
      render();
    });
    let timer;
    for (const id of ['budget', 'budget-b']) $(id).addEventListener('input', () => {
      $(`${id}-label`).value = `${$(id).value} min extra`;
      clearTimeout(timer); timer = setTimeout(render, 60);
    });
    $('planner').addEventListener('submit', e => e.preventDefault());
    const examples = [['goodge', 'kings-cross'], ['fitzroy', 'british-museum'], ['warren', 'russell'], ['euston', 'russell']];
    let example = 0;
    $('example').addEventListener('click', () => {
      const pair = examples[example++ % examples.length];
      $('start').value = 'ucl'; $('a').value = pair[0]; $('b').value = pair[1]; $('budget').value = 5; $('budget-b').value = 5; render();
    });
    $('reset').addEventListener('click', fitRoute);
    setupMapControls($('map'), fitRoute);
    $('show-map').addEventListener('click', () => {
      document.querySelector('.map-panel').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      $('map').focus({ preventScroll: true });
    });
    $('share').addEventListener('click', async () => {
      const url = location.href;
      try {
        await navigator.clipboard.writeText(url);
        $('share-status').textContent = 'Link copied. Send it to your walking buddy.';
      } catch {
        $('share-link').value = url;
        $('manual-share').hidden = false;
        $('share-link').focus(); $('share-link').select();
        $('share-status').textContent = 'Copy the link below. It includes both time limits.';
      }
    });
    render();
  } catch (error) {
    $('status').textContent = `${error.message} To run locally, use npm start and open http://localhost:4173.`;
  }
}
init();
