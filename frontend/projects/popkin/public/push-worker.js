// Popkin's push worker (ADR 0028): shows a phone alert and opens what it is about. It caches nothing.
self.addEventListener('push', (event) => {
  const alert = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(alert.title || 'Popkin', {
      body: alert.body || undefined,
      data: { url: alert.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data.url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      return open ? open.navigate(url).then((w) => w && w.focus()) : self.clients.openWindow(url);
    }),
  );
});
