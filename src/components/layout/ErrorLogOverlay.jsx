import { getErrorLog } from "../../utils/errorReport";

export default function ErrorLogOverlay({ onClose }) {
  const log = getErrorLog();
  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onClose}>
          ← Cerrar
        </button>
        <span className="screen-title">Log de errores</span>
      </div>
      <div className="screen-content" style={{ fontSize: 12 }}>
        {log.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No hay errores registrados.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {log.slice().reverse().map((e, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  background: "var(--cream)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  wordBreak: "break-word",
                }}
              >
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
                  {e.ts}
                </div>
                {e.action && (
                  <span style={{ color: "var(--purple)" }}>[{e.action}] </span>
                )}
                {e.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
