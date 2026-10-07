import json,re,sys,time,urllib.request,html,concurrent.futures as cf
sys.path.insert(0,sys.argv[1]); from price import price
S=sys.argv[1]
c=json.load(open(S+'/candidates.json'))
UA={'User-Agent':'Mozilla/5.0 (Macintosh) Chrome/124 NordInvest-price-check (contact@nordinvest.io)','Accept-Language':'da'}
def fetch(u):
    time.sleep(0.4)
    try:
        h=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=20).read().decode('utf8','ignore')
    except Exception as e: return None
    name,p,cur=price(h)
    txt=html.unescape(re.sub(r'<[^>]+>',' ',re.sub(r'<script.*?</script>|<style.*?</style>','',h,flags=re.S)))
    m2=None
    for pat in [r'([\d]+[,.]?\d*)\s*m(?:²|2)\s*(?:pr\.?|per|/)\s*(?:pakke|pk|kasse)',r'(?:pakke|pk|kasse)\w*\s*(?:indeholder|med|:)?\s*([\d]+[,.]?\d*)\s*m(?:²|2)',r'(?:indhold|dækker)[^\d]{0,20}([\d]+[,.]\d+)\s*m(?:²|2)']:
        mm=re.search(pat,txt,re.I)
        if mm:
            v=float(mm.group(1).replace(',','.'))
            if 0.3<v<10: m2=v; break
    perm2=None
    mm=re.search(r'([\d.]+,\d{2})\s*(?:kr\.?|,-)?\s*(?:pr\.?|/)\s*m(?:²|2)',txt)
    if mm: perm2=float(mm.group(1).replace('.','').replace(',','.'))
    return {'url':u,'name':name,'price':float(p) if p else None,'m2pack':m2,'perm2':perm2}
jobs=[(k,u) for k,d in c.items() for urls in d.values() for u in urls[:30]]
print(len(jobs),flush=True)
res={}
with cf.ThreadPoolExecutor(4) as ex:
    for (k,u),r in zip(jobs,ex.map(lambda j: fetch(j[1]),jobs)):
        if r and r['price']: res.setdefault(k,[]).append(r)
json.dump(res,open(S+'/prices.json','w'),ensure_ascii=False,indent=0)
for k,v in res.items(): print(k,len(v))
