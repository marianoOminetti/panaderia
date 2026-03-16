/**
 * Modal de resultado tras confirmar compra (precios actualizados, recetas afectadas).
 */
import { pctFmt } from "../../lib/format";

export default function InsumosCompraResultadoModal({
  compraResultado,
  onVerRecetasAfectadas,
  onClose,
}) {
  if (!compraResultado) return null;
  const recetasAfectadas = compraResultado.recetasAfectadas || [];
  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onClose}>
          ← Cerrar
        </button>
        <span className="screen-title">Impacto en tus recetas</span>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">
              Cambios en costos y márgenes
            </span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 4,
            }}
          >
            Se actualizaron {compraResultado.preciosActualizados} precios de insumos.
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            Estos cambios impactaron en las recetas y sus márgenes:
          </p>
        </div>
        {recetasAfectadas.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">Recetas afectadas</span>
            </div>
            {recetasAfectadas.map((r) => {
              const margenAntesTxt =
                r.margenAntes != null ? pctFmt(r.margenAntes) : "—";
              const margenDespuesTxt =
                r.margenDespues != null ? pctFmt(r.margenDespues) : "—";
              const empeoro =
                r.margenAntes != null &&
                r.margenDespues != null &&
                r.margenDespues < r.margenAntes;
              return (
                <div
                  key={r.id}
                  className="insumo-item"
                  style={{ padding: "8px 0" }}
                >
                  <div className="insumo-info" style={{ flex: 1 }}>
                    <div className="insumo-nombre">
                      {r.emoji} {r.nombre}
                    </div>
                    <div className="insumo-detalle">
                      Margen: <strong>{margenAntesTxt}</strong> →{" "}
                      <strong
                        style={{
                          color: empeoro ? "var(--danger)" : "var(--green)",
                        }}
                      >
                        {margenDespuesTxt}
                      </strong>{" "}
                      {empeoro ? "↓" : "↑"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 12,
          }}
        >
          Revisá si necesitás ajustar precios de venta.
        </p>
        {recetasAfectadas.length > 0 && onVerRecetasAfectadas && (
          <button
            className="btn-primary"
            onClick={() => {
              const ids = recetasAfectadas.map((r) => r.id);
              onVerRecetasAfectadas(ids);
              onClose();
            }}
            style={{ marginBottom: 8 }}
          >
            Ver recetas afectadas
          </button>
        )}
        <button className="btn-secondary" onClick={onClose}>
          Listo
        </button>
      </div>
    </div>
  );
}
