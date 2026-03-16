/**
 * Modal para decidir precios al confirmar compra (actualizar o mantener).
 */
import { fmt, pctFmt } from "../../lib/format";

export default function InsumosPrecioDecisionModal({
  precioDecisionModal,
  setPrecioDecisionModal,
  compraSaving,
  aplicarDecisiones,
  onClose,
}) {
  const items = precioDecisionModal?.items || [];
  const setAccion = (insumoId, accion) => {
    setPrecioDecisionModal((prev) => ({
      ...prev,
      items: (prev.items || []).map((it) =>
        it.insumoId === insumoId ? { ...it, accion } : it,
      ),
    }));
  };
  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onClose} disabled={compraSaving}>
          ← Volver
        </button>
        <span className="screen-title">Precios actualizados</span>
      </div>
      <div className="screen-content">
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginBottom: 12,
          }}
        >
          Algunos insumos tienen un precio distinto al registrado.
          Elegí qué hacer con cada uno:
        </p>
        <div className="card" style={{ marginBottom: 16 }}>
          {(items || []).map((item) => {
            const insumoId = item.insumoId;
            const accion = item.accion || "update";
            return (
              <div
                key={insumoId}
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {item.nombre}
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    marginBottom: 4,
                  }}
                >
                  Precio anterior: <strong>{fmt(item.precioAnterior)}</strong>
                  <br />
                  Precio nuevo: <strong>{fmt(item.precioNuevo)}</strong>
                  {item.diffPct != null && (
                    <>
                      <br />
                      Diferencia:{" "}
                      <strong
                        style={{
                          color:
                            item.diffPct > 0 ? "var(--danger)" : "var(--green)",
                        }}
                      >
                        {pctFmt(item.diffPct)}
                      </strong>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className={accion === "update" ? "btn-primary" : "btn-secondary"}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      fontSize: 12,
                      borderRadius: 10,
                    }}
                    onClick={() => setAccion(insumoId, "update")}
                    disabled={compraSaving}
                  >
                    ✅ Actualizar precio
                  </button>
                  <button
                    type="button"
                    className={accion === "keep" ? "btn-primary" : "btn-secondary"}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      fontSize: 12,
                      borderRadius: 10,
                    }}
                    onClick={() => setAccion(insumoId, "keep")}
                    disabled={compraSaving}
                  >
                    🕓 Mantener precio anterior
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 12,
          }}
        >
          Si no querés cambiar ningún precio, elegí &quot;Mantener precio anterior&quot; en cada uno.
        </p>
        <button
          className="btn-primary"
          onClick={aplicarDecisiones}
          disabled={compraSaving}
        >
          {compraSaving ? "Guardando…" : "Registrar compra"}
        </button>
      </div>
    </div>
  );
}
