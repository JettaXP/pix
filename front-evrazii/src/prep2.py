import json, sys, os
src, places, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
t = json.load(open(src, encoding='utf8'))
KEEP = set("""Iceland|Ireland|United Kingdom|France|Spain|Portugal|Italy|Switzerland|Germany|Austria|Belgium|Netherlands|Luxembourg|Denmark|Norway|Sweden|Finland|Estonia|Latvia|Lithuania|Poland|Belarus|Ukraine|Moldova|Romania|Bulgaria|Serbia|Montenegro|Albania|Greece|Croatia|Bosnia and Herz.|Slovenia|Slovakia|Czechia|Hungary|Macedonia|Kosovo|Russia|Turkey|Cyprus|N. Cyprus|Georgia|Armenia|Azerbaijan|Kazakhstan|Uzbekistan|Turkmenistan|Kyrgyzstan|Tajikistan|Mongolia|China|Taiwan|Japan|North Korea|South Korea|Afghanistan|Pakistan|India|Nepal|Bhutan|Bangladesh|Sri Lanka|Myanmar|Thailand|Laos|Vietnam|Cambodia|Malaysia|Iran|Iraq|Syria|Lebanon|Israel|Palestine|Jordan|Saudi Arabia|Yemen|Oman|United Arab Emirates|Qatar|Kuwait|Bahrain|Indonesia|Philippines|Brunei|Timor-Leste|Papua New Guinea|Algeria|Angola|Benin|Botswana|Burkina Faso|Burundi|Cameroon|Central African Rep.|Chad|Congo|Côte d'Ivoire|Dem. Rep. Congo|Djibouti|Egypt|Eq. Guinea|Eritrea|Ethiopia|Gabon|Gambia|Ghana|Guinea|Guinea-Bissau|Kenya|Lesotho|Liberia|Libya|Madagascar|Malawi|Mali|Mauritania|Morocco|Mozambique|Namibia|Niger|Nigeria|Rwanda|S. Sudan|Senegal|Sierra Leone|Somalia|Somaliland|South Africa|Sudan|Tanzania|Togo|Tunisia|Uganda|W. Sahara|Zambia|Zimbabwe|eSwatini""".split("|"))
geoms = [g for g in t['objects']['countries']['geometries'] if g['properties']['name'] in KEEP]
found = {g['properties']['name'] for g in geoms}
print("missing:", KEEP - found, "count", len(geoms))
used = {}
def remap(a):
    if isinstance(a, int):
        i = a if a >= 0 else ~a
        if i not in used: used[i] = len(used)
        n = used[i]
        return n if a >= 0 else ~n
    return [remap(x) for x in a]
for g in geoms:
    g['arcs'] = remap(g['arcs'])
    g['properties'] = {'name': g['properties']['name']}
    g.pop('id', None)
arcs = [None]*len(used)
for old, new in used.items(): arcs[new] = t['arcs'][old]
topo = {'type': 'Topology', 'transform': t['transform'], 'arcs': arcs, 'objects': {'c': {'type': 'GeometryCollection', 'geometries': geoms}}}
o = os.path.join(outdir, 'world.json')
json.dump(topo, open(o, 'w', encoding='utf8'), separators=(',', ':'), ensure_ascii=False)
print("world bytes", os.path.getsize(o))
P = json.load(open(places, encoding='utf8'))['features']
out = []
for f in P:
    p = f['properties']; lon, lat = p['LONGITUDE'], p['LATITUDE']
    if not ((-26 <= lon <= 180 or lon < -168) and -36 <= lat <= 77): continue
    nm = (p.get('NAME_RU') or p['NAME']).strip()
    out.append([nm, round(lon, 2), round(lat, 2), int((p.get('POP_MAX') or 0) / 1000), 1 if p.get('ADM0CAP') else 0])
out.sort(key=lambda c: -c[3])
o = os.path.join(outdir, 'cities.json')
json.dump(out, open(o, 'w', encoding='utf8'), separators=(',', ':'), ensure_ascii=False)
print("cities", len(out), os.path.getsize(o), out[:5])
