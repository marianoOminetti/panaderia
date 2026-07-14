import { fmt } from "../../lib/format";
import {
  getPedidoEstadoLabel,
  isPedidoEditable,
  canDeletePedido,
  canDesentregarPedido,
} from "../../lib/pedidos";

function formatFecha(value) {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleDateString("es-AR");
  } catch {
    return value;
  }
}

function findById(list, id) {
  if (id == null || !list?.length) return null;
  const target = String(id);
  return list.find((row) => row?.id != null && String(row.id) === target) || null;
}

export default function PedidosListItem({
  grupo,
  cliente,
  recetas,
  onMarcarEntregado,
  onDesentregar,
  onEditar,
  onCancelar,
  onShare,
}) {
  const unidades = (grupo.items || []).reduce((s, it) => s + (it.cantidad || 0), 0);
  const estado = grupo.estado || "pendiente";
  const editable = isPedidoEditable(estado);
  const desentregable = canDesentregarPedido(estado);
  const nombreCliente = cliente?.nombre || grupo.cliente_nombre || "Cliente";

  return (
    <div className="card venta-card" style={{ marginBottom: 8 }}>
      <div className="venta-grupo-cliente">
        {nombreCliente} · {formatFecha(grupo.fecha_entrega)}
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
              const receta = findById(recetas, it.receta_id);
              const nombre =
                receta?.nombre ||
                it.receta_nombre ||
                it.receta?.nombre ||
                "Producto";
              return `${it.cantidad || 0}x ${nombre}`;
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {editable && (
            <>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: 11, padding: "4px 8px", flex: 1 }}
                onClick={() => onEditar?.(grupo)}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: 11, padding: "4px 8px", flex: 1 }}
                onClick={() => onMarcarEntregado?.(grupo)}
              >
                Marcar entregado
              </button>
            </>
          )}
          {desentregable && (
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 11, padding: "4px 8px", flex: 1 }}
              onClick={() => onDesentregar?.(grupo)}
            >
              Desentregar
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
