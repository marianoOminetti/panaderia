/**
 * Módulo de notificaciones push: registro del Service Worker, suscripción VAPID y guardado en Supabase.
 * No contiene claves privadas; el envío de push se hace solo desde el backend (Edge Function).
 */
import { supabase } from "./supabaseClient";

// Registrar siempre /sw.js (sin query): ?v= duplicaba registrations y rompía pushes subsiguientes.
const SW_PATH = "/sw.js";

function canonicalSwScriptUrl() {
  return new URL(SW_PATH, window.location.origin).href;
}

/** Desregistra SW viejos (/sw.js?v=...) que dejaron la suscripción push colgada. */
export async function cleanupLegacyPushServiceWorkers() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  const canonical = canonicalSwScriptUrl();
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => {
        const script =
          r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        return script.includes("/sw.js") && script !== canonical;
      })
      .map((r) => r.unregister().catch(() => {})),
  );
}

/**
 * Registra el Service Worker para push. Debe llamarse una vez al cargar la app (ej. desde usePushSubscription).
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    await cleanupLegacyPushServiceWorkers();
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    await reg.update();
    return reg;
  } catch (err) {
    console.error("[pushNotifications] registerServiceWorker", err);
    return null;
  }
}

/**
 * Asegura SW canónico + suscripción push guardada en Supabase (upsert).
 * Re-ejecutar al abrir la app recupera filas borradas por 410 en el servidor.
 */
export async function syncPushSubscription(userId, vapidPublicKey) {
  if (!userId || !vapidPublicKey || typeof window === "undefined") return null;
  if (!("PushManager" in window) || !("serviceWorker" in navigator)) return null;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return null;

  await registerServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  if (!reg.pushManager) return null;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await subscribeUser(vapidPublicKey);
  }
  if (sub) {
    await saveSubscriptionToSupabase(sub, userId);
  }
  return sub;
}

/**
 * Suscribe al usuario a push con la clave VAPID pública. Requiere que el SW esté registrado y permiso concedido.
 * @param {string} vapidPublicKey - Clave pública VAPID (ej. desde REACT_APP_VAPID_PUBLIC_KEY)
 * @returns {Promise<PushSubscription|null>}
 */
export async function subscribeUser(vapidPublicKey) {
  if (!vapidPublicKey || typeof window === "undefined") return null;
  if (!("PushManager" in window) || !("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  if (!reg.pushManager) return null;
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    return sub;
  } catch (err) {
    console.error("[pushNotifications] subscribeUser", err);
    return null;
  }
}

/**
 * Guarda la suscripción en Supabase (tabla push_subscriptions). RLS exige user_id = auth.uid().
 * @param {PushSubscription} subscription
 * @param {string} userId - auth.uid()
 * @returns {Promise<void>}
 */
export async function saveSubscriptionToSupabase(subscription, userId) {
  if (!subscription || !userId) return;
  const endpoint = subscription.endpoint;
  const key = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");
  if (!endpoint || !key || !auth) {
    console.error("[pushNotifications] subscription missing keys");
    return;
  }
  const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(key)));
  const authSecret = btoa(String.fromCharCode.apply(null, new Uint8Array(auth)));

  // Upsert: re-guardar al abrir la app recupera suscripciones borradas por 410 en el servidor.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh: p256dh,
      auth: authSecret,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) {
    console.error("[pushNotifications] saveSubscriptionToSupabase", error);
    throw error;
  }
}

/**
 * Convierte clave VAPID en base64url a Uint8Array para PushManager.subscribe().
 * @param {string} base64String
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}
