self.addEventListener('install', (event) => {
  console.log('✅ SW installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ SW activated');
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {}

  const title = data.title || "🔥 MaxClickEmpire Update!";
  const options = {
    body: data.body || "Stay ahead with the latest updates!",
    icon: data.icon || "/favicon.ico",
    data: { url: data.url || "/" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});