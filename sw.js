/* The Stack service worker — v99 (multi-file shell).
   DEPLOY RITUAL: bump VER here whenever BUILD is bumped in app-core.js.
   The cache name change is what makes clients drop the old shell. */
const VER='v106';
const C='stack-shell-'+VER;
const ASSETS=['./','./index.html','./app.css','./firebase-init.js',
  './app-core.js','./app-render.js','./app-loop.js','./app-shell.js','./manifest.json'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>c.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k))))
      .then(()=>clients.claim())
  );
});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return; // Firebase/Firestore/fonts go straight to network
  if(e.request.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('/index.html')){
    // Network-first for the document so a deploy is picked up immediately online.
    e.respondWith(
      fetch(e.request).then(r=>{const cl=r.clone();caches.open(C).then(c=>c.put('./index.html',cl));return r;})
      .catch(()=>caches.match('./index.html'))
    );
    return;
  }
  // Stale-while-revalidate for the shell assets: instant load, silent refresh.
  e.respondWith(
    caches.match(e.request).then(hit=>{
      const net=fetch(e.request).then(r=>{
        if(r&&r.ok){const cl=r.clone();caches.open(C).then(c=>c.put(e.request,cl));}
        return r;
      }).catch(()=>hit);
      return hit||net;
    })
  );
});
