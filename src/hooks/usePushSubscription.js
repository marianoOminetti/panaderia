/**
 * Hook para suscripción push: permiso, registro SW, suscribir/desuscribir y estado.
 * Centraliza la petición de permiso (antes en App.js); no toca lógica de negocio.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  registerServiceWorker,
  subscribeUser,
  saveSubscriptionToSupabase,
} from "../lib/pushNotifications";

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

export function usePushSubscription(userId) {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const subscribeOnceRef = useRef(false);

  // Pedir permiso al montar si hay usuario y permiso aún no decidido (reemplaza el useEffect de App.js)
  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (!userId) return;
    if (Notification.permission === "default") {
      Notification.requestPermission()
        .then((p) => setPermission(p))
        .catch(() => {});
    } else {
      setPermission(Notification.permission);
    }
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

  // Comprobar si ya hay suscripción activa (getSubscription)
  useEffect(() => {
    if (!userId || permission !== "granted" || !navigator.serviceWorker) return;
    let cancelled = false;
    navigator.serviceWorker.ready.then((reg) => {
      if (!reg.pushManager || cancelled) return;
      return reg.pushManager.getSubscription().then((sub) => {
        if (!cancelled) setIsSubscribed(!!sub);
      });
    });
    return () => { cancelled = true; };
  }, [userId, permission]);

  // Auto-suscribir una vez cuando hay permiso, usuario y soporte (Etapa 1: sin botón en UI)
  useEffect(() => {
    if (
      !userId ||
      permission !== "granted" ||
      !VAPID_PUBLIC_KEY ||
      isSubscribed ||
      subscribeOnceRef.current ||
      typeof navigator === "undefined" ||
      !navigator.serviceWorker
    )
      return;
    subscribeOnceRef.current = true;
    subscribe();
  }, [userId, permission, isSubscribed]); // eslint-disable-line react-hooks/exhaustive-deps -- subscribe once when granted

  const subscribe = useCallback(async () => {
    if (!userId || !VAPID_PUBLIC_KEY) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await subscribeUser(VAPID_PUBLIC_KEY);
      }
      if (sub) {
        await saveSubscriptionToSupabase(sub, userId);
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error("[usePushSubscription] subscribe", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const unsubscribe = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      if (userId) {
        await supabase.from("push_subscriptions").delete().eq("user_id", userId);
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
