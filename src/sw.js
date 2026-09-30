/* Service worker : hors-ligne (précache Workbox) + notifications de rappel. */
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

self.skipWaiting();
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.addEventListener('push', e => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (_) {
    d = { body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || 'Budget', {
      body: d.body || '',
      tag: d.tag,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      data: { url: d.url || './' }
    })
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(
    (e.notification.data && e.notification.data.url) || './',
    self.registration.scope
  ).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
      for (const w of ws)
        if ('focus' in w) return w.focus().then(c => (c && c.navigate ? c.navigate(url) : c));
      return self.clients.openWindow(url);
    })
  );
});
