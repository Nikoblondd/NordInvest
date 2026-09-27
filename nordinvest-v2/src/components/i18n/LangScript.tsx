import { I18N_VERSION } from "@/lib/i18n/version";

/**
 * Runs before the page paints: picks the language (?lang=en|da, then the saved
 * choice, else Danish), marks <html>, and for English hides the page until the
 * first translation pass so nobody sees a flash of Danish.
 */
export function LangScript() {
  const js = `(function(){try{
var K="nordinvest-lang",d=document.documentElement;
var q=new URLSearchParams(location.search).get("lang");
if(q==="en"||q==="da"){localStorage.setItem(K,q);document.cookie=K+"="+q+"; path=/; max-age=31536000; samesite=lax";}
var l=(q==="en"||q==="da")?q:localStorage.getItem(K);
if(l==="en"){d.setAttribute("data-lang","en");d.lang="en";d.classList.add("i18n-pending");
var p=document.createElement("link");p.rel="preload";p.as="fetch";p.crossOrigin="anonymous";p.href="/i18n/en.json?v=${I18N_VERSION}";document.head.appendChild(p);
setTimeout(function(){d.classList.remove("i18n-pending")},2500);}
}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
