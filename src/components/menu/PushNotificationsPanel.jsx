/**
 * Activar / diagnosticar notificaciones push (Web Push).
 * Visible en producción; con ?debugPush=1 muestra detalle técnico.
 */
import { useState } from "react";
import { usePushSubscription } from "../../hooks/usePushSubscription";
import { notifyEvent } from "../../lib/notifyEvent";

const SHOW_DEBUG =
  process.env.REACT_APP_ENV === "development" ||
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debugPush"));

export default function PushNotificationsPanel({ userId }) {
  const push = usePushSubscription(userId);
  const [testMsg, setTestMsg] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const sendTestPush = async () => {
    setTestLoading(true);
    setTestMsg(null);
    try {
      const result = await notifyEvent("test", {});
      const sent = result?.data?.push?.sent;
      const total = result?.data?.push?.total;
      if (result?.ok && sent > 0) {
        setTestMsg(`Enviado a ${sent} de ${total} dispositivo(s).`);
      } else if (total === 0 || sent === 0) {
        setTestMsg("No llegó: activá notificaciones arriba y probá de nuevo.");
      } else {
        setTestMsg("Error al enviar. Mirá consola o Sentry.");
      }
    } finally {
      setTestLoading(false);
    }
  };

  const needsPermission = push.permission === "default" && userId;
  const blocked = push.permission === "denied";
  const iosNeedsPwa =
    push.permission === "granted" && push.vapidConfigured && !push.isSupported;
  const ready =
    userId && push.isSupported && push.permission === "granted" && !push.isSubscribed;

  if (!userId) return null;

  return (
    <div
      className="card"
      style={{
        marginTop: 16,
        padding: 12,
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>Notificaciones</p>
      <p style={{ marginBottom: 8, color: "var(--text-muted)" }}>
        Avisos de ventas y stock aunque la app esté cerrada. En iPhone: agregá la app a la
        pantalla de inicio antes de activar.
      </p>

      {SHOW_DEBUG && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          <div>
            <strong>VAPID</strong>: {push.vapidConfigured ? "Sí" : "No"}
          </div>
          <div>
            <strong>Soportado</strong>: {push.isSupported ? "Sí" : "No"}
          </div>
          <div>
            <strong>Permiso</strong>: {push.permission}
          </div>
          <div>
            <strong>Suscrito</strong>: {push.isSubscribed ? "Sí" : "No"}
          </div>
        </div>
      )}

      {!SHOW_DEBUG && (
        <p style={{ marginBottom: 8, color: "var(--text-muted)", fontSize: 12 }}>
          Estado:{" "}
          {blocked
            ? "bloqueadas en el navegador"
            : iosNeedsPwa
              ? "instalá la app en la pantalla de inicio (iPhone)"
              : push.isSubscribed
                ? "activas"
                : push.permission === "granted" && push.isSupported
                  ? "permiso OK, tocá Activar"
                  : "sin activar"}
        </p>
      )}

      {iosNeedsPwa && (
        <p style={{ marginBottom: 8, fontSize: 12, color: "var(--text-muted)" }}>
          En iPhone, las notificaciones push solo funcionan si agregás el sitio a Inicio con Safari.
        </p>
      )}

      {blocked && (
        <p style={{ marginBottom: 8, fontSize: 12, color: "var(--text-muted)" }}>
          En el candado de la barra de direcciones → Notificaciones → Permitir, y recargá.
        </p>
      )}

      {!push.vapidConfigured && (
        <p style={{ marginBottom: 8, fontSize: 12, color: "var(--danger, #c00)" }}>
          Falta configurar push en el servidor (REACT_APP_VAPID_PUBLIC_KEY).
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {needsPermission && (
          <button
            type="button"
            className="btn-primary"
            onClick={push.requestPermission}
            disabled={push.loading}
            style={{ fontSize: 13, padding: "8px 12px" }}
          >
            {push.loading ? "…" : "Permitir notificaciones"}
          </button>
        )}
        {(ready || (SHOW_DEBUG && push.permission === "granted")) && (
          <button
            type="button"
            className="btn-primary"
            onClick={push.subscribe}
            disabled={push.loading || !push.isSupported}
            style={{ fontSize: 13, padding: "8px 12px" }}
          >
            {push.loading ? "…" : push.isSubscribed ? "Re-sincronizar" : "Activar notificaciones"}
          </button>
        )}
        {push.isSubscribed && (
          <button
            type="button"
            onClick={sendTestPush}
            disabled={testLoading}
            style={{
              fontSize: 13,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
            }}
          >
            {testLoading ? "…" : "Enviar prueba"}
          </button>
        )}
        {push.isSubscribed && (
          <button
            type="button"
            onClick={push.unsubscribe}
            disabled={push.loading}
            style={{
              fontSize: 13,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
            }}
          >
            Desactivar
          </button>
        )}
      </div>
      {testMsg && (
        <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>{testMsg}</p>
      )}
    </div>
  );
}
