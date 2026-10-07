import sys,re,json,urllib.request,html
UA={'User-Agent':'Mozilla/5.0 (Macintosh) Chrome/124 NordInvest-price-check','Accept-Language':'da'}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=20).read().decode('utf8','ignore')
def price(h):
    for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>',h,re.S):
        try: j=json.loads(m.group(1).strip())
        except: continue
        st=[j] if isinstance(j,dict) else (j if isinstance(j,list) else [])
        while st:
            x=st.pop()
            if isinstance(x,list): st+=x; continue
            if not isinstance(x,dict): continue
            if '@graph' in x: st+=x['@graph']
            if x.get('@type') in ('Product',['Product']):
                o=x.get('offers') or {}
                o=o[0] if isinstance(o,list) else o
                p=o.get('price') or o.get('lowPrice') or (o.get('priceSpecification') or {}).get('price')
                return x.get('name'),p,o.get('priceCurrency')
    m=re.search(r'property="product:price:amount" content="([\d.,]+)"',h)
    t=re.search(r'<title>(.*?)</title>',h,re.S)
    return (html.unescape(t.group(1).strip()) if t else None, m.group(1) if m else None,'og')
for u in sys.argv[1:]:
    try: print(price(get(u)),u)
    except Exception as e: print('ERR',e,u)
