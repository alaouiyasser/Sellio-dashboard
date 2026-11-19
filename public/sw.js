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

// ─── Founder notifications (agents' reports, leads, alerts) ──────────────────
// Pushes carry no payload: ask the API what to show for this device.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let item = null
    try {
      const sub = await self.registration.pushManager.getSubscription()
      if (sub) {
        const res = await fetch('/api/push/latest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        if (res.ok) item = await res.json()
      }
    } catch (e) { /* show the generic notification below */ }
    await self.registration.showNotification(item?.title || 'Sellio', {
      body: item?.body || 'Jdid f la console Sellio',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { link: item?.link || '/admin/ops' },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.link) || '/admin/ops'
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) {
      if ('focus' in w) {
        if ('navigate' in w) await w.navigate(url).catch(() => {})
        return w.focus()
      }
    }
    return self.clients.openWindow(url)
  })())
})
