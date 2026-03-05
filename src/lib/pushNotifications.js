/**
 * Módulo de notificaciones push: registro del Service Worker, suscripción VAPID y guardado en Supabase.
 * No contiene claves privadas; el envío de push se hace solo desde el backend (Edge Function).
 */
import { supabase } from "./supabaseClient";

const SW_PATH = "/sw.js";

/**
 * Registra el Service Worker para push. Debe llamarse una vez al cargar la app (ej. desde usePushSubscription).
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    return reg;
  } catch (err) {
    console.error("[pushNotifications] registerServiceWorker", err);
    return null;
  }
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
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh: p256dh,
      auth: authSecret,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
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
