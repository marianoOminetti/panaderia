import { useState } from "react";
import { getErrorLog } from "../../utils/errorReport";

export default function ConfigMissing() {
  const [showLog, setShowLog] = useState(false);
  const log = showLog ? getErrorLog() : [];
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">🌾 Panadería SG</h1>
        <p className="auth-subtitle" style={{ marginBottom: 14 }}>
          Falta configuración de Supabase.
        </p>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
          <div style={{ marginBottom: 10 }}>
            Definí estas variables de entorno y reiniciá el server:
          </div>
          <div
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 12,
              background: "var(--cream)",
              border: "1px solid var(--border)",
              padding: 12,
              borderRadius: 12,
            }}
          >
            REACT_APP_SUPABASE_URL
            <br />
            REACT_APP_SUPABASE_ANON_KEY
          </div>
          <div style={{ marginTop: 12 }}>
            En local: usá <code>.env.development.local</code>. En hosting: configurá las env vars del
            proyecto.
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setShowLog(!showLog)}
              style={{
                fontSize: 12,
                color: "var(--purple)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {showLog ? "Ocultar" : "Ver"} log de errores recientes
            </button>
            {showLog && log.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  maxHeight: 120,
                  overflow: "auto",
                  background: "var(--cream)",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                {log.slice().reverse().map((e, i) => (
                  <div key={i} style={{ marginBottom: 6, wordBreak: "break-word" }}>
                    <span style={{ color: "var(--text-muted)" }}>{e.ts?.slice(11, 19)}</span>{" "}
                    {e.action ? `[${e.action}] ` : ""}
                    {e.message}
                  </div>
                ))}
              </div>
            )}
            {showLog && log.length === 0 && (
              <p style={{ marginTop: 8, fontSize: 12 }}>No hay errores registrados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
