"""Convert a single Overpass JSON export to the bundled ODbL street extract.

Usage: python3 scripts/import-osm.py /path/to/overpass.json
Query and filtering limitations are documented in data/README.md.
"""
import datetime
import json
import sys
from pathlib import Path

raw = json.loads(Path(sys.argv[1]).read_text())
ways = []
for element in raw['elements']:
    if element['type'] != 'way':
        continue
    tags = element.get('tags', {})
    if tags.get('access') in ('private', 'no') or tags.get('foot') in ('private', 'no'):
        continue
    if any(key in tags for key in ('oneway:foot', 'foot:forward', 'foot:backward')):
        continue
    ways.append({'nodes': element['nodes'], 'name': tags.get('name', ''), 'kind': tags['highway']})
used = {node for way in ways for node in way['nodes']}
nodes = [[e['id'], e['lat'], e['lon']] for e in raw['elements'] if e['type'] == 'node' and e['id'] in used]
data = {'source': 'OpenStreetMap contributors', 'licence': 'ODbL-1.0',
        'retrieved': datetime.date.today().isoformat(),
        'bounds': [51.514, -0.149, 51.535, -0.113], 'nodes': nodes, 'ways': ways}
Path('data/bloomsbury.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
print(f'Imported {len(nodes)} nodes and {len(ways)} ways.')
