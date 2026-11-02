# Bloomsbury street extract

`bloomsbury.json` is derived from OpenStreetMap via the public Overpass API, retrieved on 2 November 2026. Bounds: south 51.514, west -0.149, north 51.535, east -0.113. Ways intersecting this box may have nodes outside it.

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). This database extract is made available under the [Open Database Licence (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Individual contents are available under the [Database Contents Licence](https://opendatacommons.org/licenses/dbcl/1-0/). Attribution must remain visible when displaying or redistributing this data. The project MIT licence does not apply to this file.

## Reproduce the extract

Run this query once in [Overpass Turbo](https://overpass-turbo.eu/) and export the raw JSON:

```text
[out:json][timeout:45];
way[highway~"^(footway|pedestrian|residential|living_street|tertiary|secondary|primary|unclassified|service|steps|path)$"]
  [access!~"^(private|no)$"][foot!~"^(no|private)$"]
  (51.514,-0.149,51.535,-0.113);
(._;>;);
out body;
```

Then, from the repository root:

```sh
python3 scripts/import-osm.py /path/to/overpass.json
```

The import retains geometry, street name and highway class, and excludes explicit `private`/`no` access or foot restrictions and ways with directional pedestrian tags (`oneway:foot`, `foot:forward`, `foot:backward`). The app treats remaining edges as undirected. This is deliberately simplified: conditional permissions, gates, barriers, implicit restrictions and access relations are not interpreted. Main-road and stair inclusion is not an accessibility guarantee. Place coordinates in `places.js` are approximate reference points; routes begin/end at the nearest connected node, not necessarily a building entrance.

No live map tiles or third-party routing requests are made by the app.
