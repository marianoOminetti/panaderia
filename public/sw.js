/**
 * Service Worker para notificaciones push (Web Push).
 * Muestra notificación con título/cuerpo del payload; al hacer clic abre la app con la URL del payload.
 *
 * No usamos `tag`: en Android, tags + renotify:false pueden silenciar avisos nuevos.
 * Cada push debe apilarse como notificación independiente.
 */
const SW_VERSION = "push-repeat-fix-1";
const DEFAULT_ICON = "/notification-icon-192.png";
const DEFAULT_BADGE = "/notification-badge-72.png";

function assetUrl(path) {
  return new URL(path, self.location.origin).href;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "Gluten Free", body: "" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text() || "";
    }
  }

  const title = data.title || "Gluten Free";
  const options = {
    body: data.body || "",
    icon: assetUrl(data.icon || DEFAULT_ICON),
    badge: assetUrl(data.badge || DEFAULT_BADGE),
    data: { url: data.url || "/", swVersion: SW_VERSION },
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.error("[sw] showNotification failed", err, { title, swVersion: SW_VERSION });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          try {
            await client.navigate(url);
          } catch {
            /* navigate no soportado en algunos browsers */
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(new URL(url, self.location.origin).href);
      }
    }),
  );
});
