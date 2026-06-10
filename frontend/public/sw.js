// =====================================================================
// Shifa Store — Service Worker (push notifications + offline caching)
// Placed in /public so it's served at root scope in BOTH dev & prod.
// =====================================================================

const CACHE_NAME = 'shifa-store-v1';

// ── Install ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Push Event — show OS-level notification ──────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Shifa Store', body: event.data ? event.data.text() : 'New notification' };
  }

  const title = data.title || 'Shifa Store';
  const options = {
    body: data.body || 'You have a new update.',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: data.tag || 'shifa-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click — open or focus the app ───────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const fullUrl = self.location.origin + targetUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if ((client.url === fullUrl || client.url.startsWith(self.location.origin + targetUrl)) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});
