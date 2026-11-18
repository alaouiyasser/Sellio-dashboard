// Sellio service worker: makes the dashboard installable and shows a small
// offline page when there is no connection. It never caches API calls or
// private pages: orders and money must always come fresh from the server.
const CACHE = 'sellio-shell-v1'
const OFFLINE_URL = '/offline.html'
const SHELL = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  // Only page navigations: when offline, show the offline page instead of the browser error.
  if (req.mode !== 'navigate') return
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
})
