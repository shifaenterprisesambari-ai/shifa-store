import { precacheAndRoute } from 'workbox-precaching';

// Precache resources
precacheAndRoute(self.__WB_MANIFEST || []);

// Listen for push notifications
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Shifa Store';
    const options = {
      body: data.body || 'You have a new notification.',
      icon: '/logo.png',
      badge: '/logo.png',
      data: {
        url: data.url || '/',
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Push notification error:', err);
  }
});

// Open link on click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus if tab already open
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
