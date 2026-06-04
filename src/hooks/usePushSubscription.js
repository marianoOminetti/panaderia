/**
 * Hook para suscripción push: permiso, registro SW, suscribir/desuscribir y estado.
 * Centraliza la petición de permiso (antes en App.js); no toca lógica de negocio.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  registerServiceWorker,
  getExistingPushSubscription,
  syncPushSubscription,
} from "../lib/pushNotifications";

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

export function usePushSubscription(userId) {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    setPermission(Notification.permission);
  }, [userId]);

  const requestPermission = useCallback(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return Promise.resolve(Notification?.permission);
    return Notification.requestPermission().then((p) => {
      setPermission(p);
      return p;
    });
  }, []);

  // Registrar SW cuando hay usuario
  useEffect(() => {
    if (!userId || typeof navigator === "undefined" || !navigator.serviceWorker) return;
    registerServiceWorker().catch(() => {});
  }, [userId]);

  // Comprobar si ya hay suscripción activa (SW registrado; evita InvalidStateError en iOS)
  useEffect(() => {
    if (!userId || permission !== "granted" || !navigator.serviceWorker) return;
    let cancelled = false;
    getExistingPushSubscription().then((sub) => {
      if (!cancelled) setIsSubscribed(!!sub);
    });
    return () => { cancelled = true; };
  }, [userId, permission]);

  // Sincronizar SW + suscripción en Supabase cada vez que hay permiso (recupera 410 del servidor).
  useEffect(() => {
    if (
      !userId ||
      permission !== "granted" ||
      !VAPID_PUBLIC_KEY ||
      typeof navigator === "undefined" ||
      !navigator.serviceWorker
    )
      return;

    let cancelled = false;
    syncPushSubscription(userId, VAPID_PUBLIC_KEY)
      .then((sub) => {
        if (!cancelled) setIsSubscribed(!!sub);
      })
      .catch((err) => {
        console.error("[usePushSubscription] sync", err);
        if (!cancelled) setIsSubscribed(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, permission]);

  const subscribe = useCallback(async () => {
    if (!userId || !VAPID_PUBLIC_KEY) return;
    setLoading(true);
    try {
      const sub = await syncPushSubscription(userId, VAPID_PUBLIC_KEY);
      setIsSubscribed(!!sub);
    } catch (err) {
      console.error("[usePushSubscription] subscribe", err);
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const unsubscribe = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    setLoading(true);
    try {
      const sub = await getExistingPushSubscription();
      const endpoint = sub?.endpoint;
      if (sub) await sub.unsubscribe();
      if (userId && endpoint) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("[usePushSubscription] unsubscribe", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    requestPermission,
    loading,
    vapidConfigured: !!VAPID_PUBLIC_KEY,
    isSupported:
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      !!VAPID_PUBLIC_KEY,
  };
}
