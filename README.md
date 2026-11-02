# One More Minute

**Different ways home. A little longer together.**

A small routing experiment: two friends leave the same place for different destinations. How much of the walk can they share if each is happy to add a few minutes?

[**Try the live demo**](https://t7acct.github.io/one-more-minute/) · [Routing engine](routing.js) · [Tests](tests/routing.test.js)

![One More Minute showing a shared walk around UCL](docs/demo.png)

## Try it

1. Pick a starting point and two destinations around UCL and Bloomsbury.
2. Move the extra-time slider from 0 to 10 minutes per person.
3. See the shared route, goodbye point, total journey times and each person's detour.

The URL remembers your choices, so you can copy it to share a particular plan. The bundled map works without API keys, map-tile requests, accounts or a backend.

## Run locally

Requires Python 3 for the development server. Node.js 22+ is needed only for tests.

```sh
git clone https://github.com/t7acct/one-more-minute.git
cd one-more-minute
python3 -m http.server 4173 --bind 127.0.0.1
```

Open **http://localhost:4173**. Alternatively, `npm start` runs the same server. There are no packages to install. Opening `index.html` directly will not work because the app fetches its local street data.

```sh
npm test
```

## The interesting bit

The streets form an undirected weighted graph. Edges use geographic distance divided by a fixed walking speed of 1.35 m/s (about 4.9 km/h).

For start **S**, destinations **A** and **B**, and a proposed split point **M**, the two candidate journeys cost:

```text
person A: d(S, M) + d(M, A)
person B: d(S, M) + d(M, B)
```

Both must fit within their direct shortest-route time plus their extra-time allowance. Three Dijkstra runs, using a binary min-heap, provide the distances and paths. The planner checks candidate junctions, rejects routes with repeated vertices, counts the actual common prefix, and selects the candidate with the most shared time. Ties favour lower combined journey time.

This is a **shortest-path candidate search**, not an exact global optimiser over every possible simple path. Equal-cost alternatives and non-shortest shared prefixes can lead to better solutions outside the candidate set. Tree construction takes `O((V + E) log V)`; candidate reconstruction adds path-length-dependent work. The browser caches results for slider settings until the destinations change.

Tests cover shortest-path relaxation, the extra-time constraint, dead-end backtracking, identical destinations, disconnected graphs, and route continuity, costs, budgets and loop avoidance on the bundled real street network.

## Scope of v0.1

- Twelve preset places around UCL; all destinations snap to street nodes connected to the starting area's component.
- Original SVG street rendering with solid/dashed route styles and text summaries.
- Responsive layout and keyboard-operable native controls.
- Static hosting, with all route calculation on your device.

The extract has a fixed boundary, so this is not a London-wide route planner. Snapping omits the small walk from a named place to its street node. The graph simplifies pedestrian access, ignores barriers, crossings, opening hours, live closures and accessibility, and treats retained edges as bidirectional. It is an experiment, not turn-by-turn navigation. See [data provenance and limitations](data/README.md).

Possible next steps: address search, separate time budgets, turn instructions, better pedestrian access modelling and a broader map.

## Licence

Source code: [MIT](LICENSE). Map data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), distributed under the [Open Database Licence](https://opendatacommons.org/licenses/odbl/1-0/). The data licence is separate from the code licence.
