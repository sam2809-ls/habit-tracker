/* Road to Ready service worker: lets the app show notifications on mobile Chrome */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list =>
      list.length ? list[0].focus() : clients.openWindow('./')
    )
  );
});
