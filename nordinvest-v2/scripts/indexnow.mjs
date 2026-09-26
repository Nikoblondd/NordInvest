#!/usr/bin/env node
// Push URLs to IndexNow (Bing, Copilot, Yandex, Seznam, Naver) right after a deploy.
//   node scripts/indexnow.mjs                      -> every URL in the live sitemap
//   node scripts/indexnow.mjs /blog/a /blog/b      -> just these paths
// The key file lives at public/<KEY>.txt, which is how the engines verify us.
const HOST = "nordinvest.io";
const KEY = "e8b86b63d25bd8d7526ba2946f4b3e10";

const args = process.argv.slice(2);
let urls = args.map((a) => (a.startsWith("http") ? a : `https://${HOST}${a.startsWith("/") ? a : `/${a}`}`));
if (!urls.length) {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urls.length} URL(s)`);
if (res.status >= 400) process.exit(1);
