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
import {
  VAPID_PUBLIC_KEY,
  getNotificationPermission,
  isPushEnvironmentReady,
  canUseServiceWorker,
} from "./pushSubscriptionEnv";

export function usePushSubscription(userId) {
  const [permission, setPermission] = useState(getNotificationPermission);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    setPermission(Notification.permission);
  }, [userId]);

  const requestPermission = useCallback(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return Promise.resolve(Notification?.permission);
    }
    return Notification.requestPermission().then((p) => {
      setPermission(p);
      return p;
    });
  }, []);

  useEffect(() => {
    if (!userId || !canUseServiceWorker()) return;
    registerServiceWorker().catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId || permission !== "granted" || !canUseServiceWorker()) return;
    let cancelled = false;
    getExistingPushSubscription().then((sub) => {
      if (!cancelled) setIsSubscribed(!!sub);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, permission]);

  useEffect(() => {
    if (!userId || permission !== "granted" || !VAPID_PUBLIC_KEY || !canUseServiceWorker())
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
    if (!canUseServiceWorker()) return;
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
    isSupported: isPushEnvironmentReady(),
  };
}
