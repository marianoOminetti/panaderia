/**
 * Extrae p256dh/auth en base64url (formato Web Push / PushSubscription.toJSON).
 */

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * @param {PushSubscription} subscription
 * @returns {{ p256dh: string, auth: string } | null}
 */
export function extractPushSubscriptionKeys(subscription) {
  if (!subscription) return null;

  if (typeof subscription.toJSON === "function") {
    const json = subscription.toJSON();
    const p256dh = json?.keys?.p256dh;
    const auth = json?.keys?.auth;
    if (p256dh && auth) return { p256dh, auth };
  }

  const p256dhKey = subscription.getKey("p256dh");
  const authKey = subscription.getKey("auth");
  if (!p256dhKey || !authKey) return null;

  return {
    p256dh: bufferToBase64Url(p256dhKey),
    auth: bufferToBase64Url(authKey),
  };
}
