// Väggen – service worker: gör spelet installerbart och spelbart utan internet.
const CACHE='vaggen-v1.17';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Sidan själv: hämta ny version när det finns nät, annars den sparade.
  if(req.mode==='navigate'||url.pathname.endsWith('/index.html')){
    e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',cp));return r;}).catch(()=>caches.match('./index.html')));return;}
  // Musik, ikoner och typsnitt: från cachen om de finns, annars hämta och spara.
  const media=/\.(mp4|m4a|mp3|ogg|png)$/i.test(url.pathname);
  e.respondWith(caches.match(req).then(hit=>{
    if(hit&&!(media&&/text\/html/i.test(hit.headers.get('content-type')||'')))return hit;
    return fetch(req).then(r=>{const ct=r.headers.get('content-type')||'';
      // Spara aldrig en webbsida i stället för en ljud- eller bildfil.
      if((r.ok&&!(media&&/text\/html/i.test(ct)))||r.type==='opaque'){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp));}return r;});}));
});
