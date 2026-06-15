export const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

export function getNotificationPermission() {
  return typeof Notification !== "undefined" ? Notification.permission : "default";
}

export function isPushEnvironmentReady() {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

export function canUseServiceWorker() {
  return typeof navigator !== "undefined" && !!navigator.serviceWorker;
}
