import { useState, useMemo } from "react";
import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import {
  agruparPedidos,
  getPedidoEstadoLabel,
  isPedidoEditable,
  canDeletePedido,
} from "../../lib/pedidos";
import ShareTicketModal from "../shared/ShareTicketModal";

function formatFecha(value) {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleDateString("es-AR");
  } catch {
    return value;
  }
}

export default function PedidosList({
  pedidos,
  recetas,
  clientes,
  search,
  estadoFilter,
  soloProximos,
  onChangeEstado,
  onMarcarEntregado,
  onCancelar,
}) {
  const [sharePedido, setSharePedido] = useState(null);
  const hoyStr = hoyLocalISO();

  const grupos = useMemo(() => agruparPedidos(pedidos || []), [pedidos]);

  const filtered = useMemo(() => {
    const hoy = hoyStr;
    const matchesSearch = (g) => {
      if (!search.trim()) return true;
      const lower = search.toLowerCase();
      const cliente = (clientes || []).find((c) => c.id === g.cliente_id);
      const clienteMatch =
        cliente &&
        `${cliente.nombre || ""} ${cliente.telefono || ""}`.toLowerCase().includes(lower);
      const productosMatch = (g.items || []).some((it) => {
        const receta = (recetas || []).find((r) => r.id === it.receta_id);
        return (
          receta &&
          `${receta.nombre || ""} ${receta.emoji || ""}`.toLowerCase().includes(lower)
        );
      });
      return clienteMatch || productosMatch;
    };

    const pendientesFuturo = [];
    const pendientesPasado = [];
    const otrosFuturo = [];
    const otrosPasado = [];

    for (const g of grupos || []) {
      if (!matchesSearch(g)) continue;
      const estado = g.estado || "pendiente";
      const fecha = g.fecha_entrega || "";
      const esPendiente = estado !== "entregado";
      const esFuturoOHoy = fecha && fecha >= hoy;

      if (esPendiente && esFuturoOHoy) pendientesFuturo.push(g);
      else if (esPendiente) pendientesPasado.push(g);
      else if (esFuturoOHoy) otrosFuturo.push(g);
      else otrosPasado.push(g);
    }

    pendientesFuturo.sort((a, b) => (a.fecha_entrega || "").localeCompare(b.fecha_entrega || ""));
    pendientesPasado.sort((a, b) => (b.fecha_entrega || "").localeCompare(a.fecha_entrega || ""));
    otrosFuturo.sort((a, b) => (a.fecha_entrega || "").localeCompare(b.fecha_entrega || ""));
    otrosPasado.sort((a, b) => (b.fecha_entrega || "").localeCompare(a.fecha_entrega || ""));

    return [...pendientesFuturo, ...pendientesPasado, ...otrosFuturo, ...otrosPasado];
  }, [grupos, hoyStr, search, clientes, recetas]);

  const buildShareData = (g) => {
    const cliente = (clientes || []).find((c) => c.id === g.cliente_id);
    return {
      fecha_entrega: g.fecha_entrega,
      hora_entrega: g.hora_entrega,
      estado: g.estado,
      cliente: cliente?.nombre || "Cliente",
      senia: g.senia || 0,
      total: g.total || 0,
      notas: g.notas,
      items: (g.items || []).map((it) => {
        const r = recetas.find((rec) => rec.id === it.receta_id);
        return {
          receta_id: it.receta_id,
          receta: r ? { nombre: r.nombre, emoji: r.emoji } : null,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        };
      }),
    };
  };

  if (!filtered.length) {
    return (
      <div className="empty">
        <div className="empty-icon">📦</div>
        <p>Sin pedidos para los filtros seleccionados</p>
      </div>
    );
  }

  return (
    <>
      {filtered.map((g) => {
        const cliente = (clientes || []).find((c) => c.id === g.cliente_id);
        const unidades = (g.items || []).reduce(
          (s, it) => s + (it.cantidad || 0),
          0,
        );
        return (
          <div
            key={g.key}
            className="card venta-card"
            style={{ marginBottom: 8 }}
          >
            <div className="venta-grupo-cliente">
              {cliente?.nombre || "Cliente"} · {formatFecha(g.fecha_entrega)}
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
                {(g.items || [])
                  .map((it) => {
                    const receta = (recetas || []).find(
                      (r) => r.id === it.receta_id,
                    );
                    return `${it.cantidad || 0}x ${
                      receta?.nombre || "Producto"
                    }`;
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
                {getPedidoEstadoLabel(g.estado || "pendiente")}
              </span>
            </div>
            <div
              className="insumo-precio"
              style={{ minWidth: 120, marginTop: 4 }}
            >
              <div className="insumo-precio-value">{fmt(g.total)}</div>
              {g.senia > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  Seña {fmt(g.senia)}
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
                {getPedidoEstadoLabel(g.estado || "pendiente")}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {isPedidoEditable(g.estado || "pendiente") && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      flex: 1,
                    }}
                    onClick={() => onMarcarEntregado?.(g)}
                  >
                    Marcar entregado
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                  }}
                  onClick={() => onCancelar?.(g)}
                  disabled={!canDeletePedido(g.estado || "pendiente")}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                  }}
                  onClick={() => setSharePedido(g)}
                  title="Compartir"
                >
                  📤
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {sharePedido && (
        <ShareTicketModal
          type="pedido"
          data={buildShareData(sharePedido)}
          onClose={() => setSharePedido(null)}
        />
      )}
    </>
  );
}

