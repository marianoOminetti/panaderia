import { fmt } from "../../lib/format";
import {
  getPedidoEstadoLabel,
  isPedidoEditable,
  canDeletePedido,
} from "../../lib/pedidos";

function formatFecha(value) {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleDateString("es-AR");
  } catch {
    return value;
  }
}

export default function PedidosListItem({
  grupo,
  cliente,
  recetas,
  onMarcarEntregado,
  onCancelar,
  onShare,
}) {
  const unidades = (grupo.items || []).reduce((s, it) => s + (it.cantidad || 0), 0);
  const estado = grupo.estado || "pendiente";

  return (
    <div className="card venta-card" style={{ marginBottom: 8 }}>
      <div className="venta-grupo-cliente">
        {cliente?.nombre || "Cliente"} · {formatFecha(grupo.fecha_entrega)}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span>
          {unidades} u ·{" "}
          {(grupo.items || [])
            .map((it) => {
              const receta = (recetas || []).find((r) => r.id === it.receta_id);
              return `${it.cantidad || 0}x ${receta?.nombre || "Producto"}`;
            })
            .join(" · ")}
        </span>
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 10,
            background: "rgba(74,124,89,0.08)",
            color: "var(--green)",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {getPedidoEstadoLabel(estado)}
        </span>
      </div>
      <div className="insumo-precio" style={{ minWidth: 120, marginTop: 4 }}>
        <div className="insumo-precio-value">{fmt(grupo.total)}</div>
        {grupo.senia > 0 && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Seña {fmt(grupo.senia)}
          </div>
        )}
        <div
          className="form-input"
          style={{
            marginTop: 6,
            fontSize: 11,
            padding: "6px 10px",
            opacity: 0.7,
            cursor: "default",
            textAlign: "left",
          }}
        >
          {getPedidoEstadoLabel(estado)}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          {isPedidoEditable(estado) && (
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 11, padding: "4px 8px", flex: 1 }}
              onClick={() => onMarcarEntregado?.(grupo)}
            >
              Marcar entregado
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: 11, padding: "4px 8px" }}
            onClick={() => onCancelar?.(grupo)}
            disabled={!canDeletePedido(estado)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: 11, padding: "4px 8px" }}
            onClick={() => onShare(grupo)}
            title="Compartir"
          >
            📤
          </button>
        </div>
      </div>
    </div>
  );
}
