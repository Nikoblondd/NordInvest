"""Build src/data/materialepriser.json from scraped product prices.

Usage: python3 scripts/materials/build.py <prices.json>
prices.json comes from the price scraper (product name, price, pack size, URL).
For each basket item we keep only matching products, convert to a unit price,
and store a budget price (20th percentile, so it is a real product rather than
the odd clearance item), a standard price (median) and the product nearest the
budget price as a direct link.
"""
import json, re, sys, statistics, datetime
from urllib.parse import urlparse
basket = json.load(open('scripts/materials/basket.json'))
raw = json.load(open(sys.argv[1]))
STORE = {'silvan.dk': 'Silvan', 'xl-byg.dk': 'XL-BYG', 'bauhaus.dk': 'Bauhaus', 'jemogfix.dk': 'jem & fix', 'harald-nyborg.dk': 'Harald Nyborg'}
def liters(n):
    m = re.search(r'([\d]+[,.]?\d*)\s*l\b', n.lower())
    return float(m.group(1).replace(',', '.')) if m else None
out = {}
for k, spec in basket.items():
    rows = []
    for x in raw.get(k, []):
        n = (x.get('name') or '').lower()
        if not re.search(spec['inc'], n) or (spec['exc'] and re.search(spec['exc'], n)):
            continue
        if spec['unit'] == 'm2':
            u = x.get('perm2') or (x['price'] / x['m2pack'] if x.get('m2pack') else None)
        elif spec['unit'] == 'l':
            L = liters(n); u = x['price'] / L if L else None
        else:
            u = x['price']
        if u and u > 0:
            rows.append((u, x))
    if len(rows) < 3:
        continue
    rows.sort(key=lambda t: t[0])
    us = [u for u, _ in rows]
    budget = us[int(0.2 * len(us))]
    def pack(x):
        n = (x.get('name') or '').lower()
        if spec['unit'] == 'm2':
            return x.get('m2pack') or 1
        if spec['unit'] == 'l':
            return liters(n) or 1
        return 1
    def prod(u, x):
        host = urlparse(x['url']).netloc.replace('www.', '')
        return {'name': x['name'], 'url': x['url'], 'store': STORE.get(host, host), 'price': x['price'], 'pack': round(pack(x), 2), 'unitPrice': round(u, 2)}
    pick = min(rows, key=lambda t: abs(t[0] - budget))
    # Cheaper real options: the three lowest unit prices from the 10th percentile up
    # (the very cheapest are often clearance or the wrong product).
    lo = int(0.1 * len(rows))
    alts, seen = [], {pick[1]['name']}
    for u, x in rows[lo:]:
        if x['name'] in seen:
            continue
        seen.add(x['name'])
        alts.append(prod(u, x))
        if len(alts) == 3:
            break
    out[k] = {
        'label': spec['label'], 'unit': spec['unit'],
        'budget': round(budget, 2), 'standard': round(statistics.median(us), 2), 'n': len(rows),
        'product': prod(*pick), 'alternatives': alts,
    }
json.dump({'fetched': datetime.date.today().isoformat(), 'items': out}, open('src/data/materialepriser.json', 'w'), ensure_ascii=False, indent=1)
for k, v in out.items():
    print(f"{k:15} {v['unit']:3} budget {v['budget']:8.0f} std {v['standard']:8.0f} n={v['n']:3} {v['product']['store']}: {v['product']['name'][:50]}")
