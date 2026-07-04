const C='stack-shell-v1';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.add('./index.html').catch(()=>{})));});
self.addEventListener('activate',e=>{e.waitUntil(clients.claim());});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/')){
    e.respondWith(
      fetch(e.request).then(r=>{const cl=r.clone();caches.open(C).then(c=>c.put('./index.html',cl));return r;})
      .catch(()=>caches.match('./index.html'))
    );
  }
});
