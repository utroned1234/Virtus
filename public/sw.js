// Service Worker para notificaciones push
self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || 'Nueva notificación de SmartHogar',
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    image: data.image || undefined,
    vibrate: [200, 100, 200],
    tag: data.tag || 'smarthogar-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/home'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SmartHogar', options)
  );
});

// Click en la notificación
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/home';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Si ya hay una ventana abierta, enfocarla
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Si no hay ventana, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Instalación del Service Worker
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// Activación
self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
