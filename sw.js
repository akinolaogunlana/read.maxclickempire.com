// sw.js – Service Worker for Push Notifications

self.addEventListener("install", event => {
  // Activate immediately
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push events
self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.warn("Push event data invalid:", e);
    data = { title: "📢 Notification", body: "You have a new alert.", icon: "/favicon.ico", url: "/" };
  }

  const options = {
    body: data.body || "You have a new alert.",
    icon: data.icon || "/favicon.ico",
    data: { url: data.url || "/" },
    badge: data.icon || "/favicon.ico"
  };

  event.waitUntil(self.registration.showNotification(data.title || "📢 Notification", options));
});

// Handle notification click
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
