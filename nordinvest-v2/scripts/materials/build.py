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
    pick = min(rows, key=lambda t: abs(t[0] - budget))[1]
    host = urlparse(pick['url']).netloc.replace('www.', '')
    out[k] = {
        'label': spec['label'], 'unit': spec['unit'],
        'budget': round(budget, 2), 'standard': round(statistics.median(us), 2), 'n': len(rows),
        'product': {'name': pick['name'], 'url': pick['url'], 'store': STORE.get(host, host), 'price': pick['price']},
    }
json.dump({'fetched': datetime.date.today().isoformat(), 'items': out}, open('src/data/materialepriser.json', 'w'), ensure_ascii=False, indent=1)
for k, v in out.items():
    print(f"{k:15} {v['unit']:3} budget {v['budget']:8.0f} std {v['standard']:8.0f} n={v['n']:3} {v['product']['store']}: {v['product']['name'][:50]}")
