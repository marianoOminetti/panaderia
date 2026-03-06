/**
 * Cabecera de la app: título (link a Inicio), botón log de errores, cerrar sesión.
 * Usado por App.js.
 */
import { getErrorLog } from "../../utils/errorReport";

export default function AppHeader({ setErrorLogOpen, signOut, showToast, onGoHome }) {
  return (
    <div className="header">
      <div className="header-top">
        <button
          type="button"
          onClick={onGoHome}
          className="header-title-btn"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            font: "inherit",
            color: "inherit",
            textAlign: "left",
          }}
        >
          <h1>🌾 Gluten Free</h1>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {getErrorLog().length > 0 && (
            <button
              type="button"
              onClick={() => setErrorLogOpen(true)}
              title="Ver errores"
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 11,
                color: "white",
                cursor: "pointer",
              }}
            >
              ⚠ {getErrorLog().length}
            </button>
          )}
          <button
            type="button"
            className="auth-logout"
            onClick={() => signOut().catch(() => showToast?.("Error al cerrar sesión"))}
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
