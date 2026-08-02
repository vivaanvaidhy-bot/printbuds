const CACHE="mini-maker-shop-v7";
const ASSETS=["./","./index.html","./dashboard.html","./colors.html","./designs.html","./inventory.html","./orders_admin.html","./reports.html","./manifest.webmanifest","./supabase-config.js","./assets/css/base.css","./assets/css/customer.css","./assets/css/admin.css","./assets/js/models/defaults.js","./assets/js/models/mappers.js","./assets/js/lib/storage.js","./assets/js/api/client.js","./assets/js/api/index.js","./assets/js/app/customer.js","./assets/js/app/admin-common.js"];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener("activate",event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||new URL(event.request.url).pathname.startsWith("/api/"))return;
  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response})));
});
