/**
 * Service Worker para notificaciones push (Web Push).
 * Muestra notificación con título/cuerpo del payload; al hacer clic abre la app con la URL del payload.
 *
 * tag: mismo tag solo para actualizar la misma notificación; eventos distintos deben traer tag único desde el backend.
 */
const DEFAULT_ICON = "/notification-icon-192.png";
const DEFAULT_BADGE = "/notification-badge-72.png";

function assetUrl(path) {
  return new URL(path, self.location.origin).href;
}

self.addEventListener("push", (event) => {
  let data = { title: "Gluten Free", body: "" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text() || "";
    }
  }
  const options = {
    body: data.body || "",
    icon: assetUrl(data.icon || DEFAULT_ICON),
    badge: assetUrl(data.badge || DEFAULT_BADGE),
    data: { url: data.url || "/" },
    renotify: false,
  };
  if (data.tag) {
    options.tag = data.tag;
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Gluten Free", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(new URL(url, self.location.origin).href);
      }
    })
  );
});
