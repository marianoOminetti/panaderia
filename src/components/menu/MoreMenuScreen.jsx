/**
 * Pantalla "Más": grilla de ítems (analytics, plan, clientes, insumos, recetas) que navegan por setTab.
 * En dev muestra panel de push (usePushSubscription). items = MORE_MENU_ITEMS desde App.
 */
import { useAuth } from "../../hooks/useAuth";
import { usePushSubscription } from "../../hooks/usePushSubscription";

const IS_DEV =
  process.env.REACT_APP_ENV === "development" ||
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debugPush"));

export default function MoreMenuScreen({ items, onNavigate }) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const push = usePushSubscription(userId);

  return (
    <div className="content">
      <p className="page-title">Más</p>
      <p className="page-subtitle">Acceso rápido al resto de la app</p>
      <div className="dashboard-quick-grid">
        {items.map(({ id, icon, label, sub }) => (
          <button
            key={id}
            type="button"
            className="dashboard-quick"
            onClick={() => onNavigate?.(id)}
          >
            <span className="dashboard-quick-icon">{icon}</span>
            <div className="dashboard-quick-text">
              <span className="dashboard-quick-label">{label}</span>
              <span className="dashboard-quick-sub">{sub}</span>
            </div>
          </button>
        ))}
      </div>
      {IS_DEV && (
        <div
          className="card"
          style={{
            marginTop: 16,
            padding: 12,
            fontSize: 12,
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Dev · Push notifications</p>
          <p style={{ marginBottom: 8, color: "var(--text-muted)" }}>
            Solo visible en development. Sirve para probar la suscripción y ver estado.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div>
              <strong>VAPID en .env</strong>: {push.vapidConfigured ? "Sí" : "No"}
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
          {push.permission === "denied" && (
            <p style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
              Chrome bloqueó las notificaciones. Para resetear: clic en el ícono del candado (o
              información) en la barra de direcciones → Configuración del sitio → Notificaciones →
              elegir &quot;Preguntar&quot; o &quot;Permitir&quot;. Luego recargá la página.
            </p>
          )}
          {!userId && (
            <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
              Iniciá sesión para poder suscribirte a push.
            </p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {push.permission === "default" && userId && (
              <button
                type="button"
                onClick={push.requestPermission}
                disabled={push.loading}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: push.loading ? "var(--border)" : "var(--purple)",
                  color: "white",
                  fontSize: 12,
                  cursor: push.loading ? "default" : "pointer",
                }}
              >
                {push.loading ? "…" : "Pedir permiso ahora"}
              </button>
            )}
            <button
              type="button"
              onClick={push.subscribe}
              disabled={
                push.loading || !push.isSupported || !userId || push.permission !== "granted"
              }
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                background:
                  push.loading || !push.isSupported || !userId || push.permission !== "granted"
                    ? "var(--border)"
                    : "var(--purple)",
                color: "white",
                fontSize: 12,
                cursor:
                  push.loading || !push.isSupported || !userId || push.permission !== "granted"
                    ? "default"
                    : "pointer",
              }}
            >
              {push.loading ? "Trabajando…" : "Forzar suscripción ahora"}
            </button>
            <button
              type="button"
              onClick={push.unsubscribe}
              disabled={push.loading || !push.isSupported || !userId || !push.isSubscribed}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                fontSize: 12,
                cursor:
                  push.loading || !push.isSupported || !userId || !push.isSubscribed
                    ? "default"
                    : "pointer",
              }}
            >
              Cancelar suscripción
            </button>
          </div>
          <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
            Mirá la consola del navegador para errores detallados
            ({`[pushNotifications]`}, `[usePushSubscription]`) y la tabla
            `push_subscriptions` en Supabase para ver si se guardó la fila.
          </p>
        </div>
      )}
    </div>
  );
}
