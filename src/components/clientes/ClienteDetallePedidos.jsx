import { useState } from "react";
import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import { FormInput, FormMoneyInput, SearchableSelect, DatePicker } from "../ui";
import ShareTicketModal from "../shared/ShareTicketModal";
import { getPedidoEstadoLabel } from "../../lib/pedidos";

function ClienteDetallePedidos({
  pedidosClienteAgrupados,
  recetas,
  savingEntrega,
  actualizarEstadoPedido,
  marcarPedidoEntregado,
  clienteNombre,
}) {
  const [sharePedido, setSharePedido] = useState(null);

  const hoyStr = hoyLocalISO();
  const pendientes = pedidosClienteAgrupados.filter((g) => {
    if (!g.fecha_entrega) return g.estado !== "entregado";
    return g.fecha_entrega >= hoyStr && g.estado !== "entregado";
  });

  const buildShareData = (g) => ({
    fecha_entrega: g.fecha_entrega,
    hora_entrega: g.hora_entrega,
    estado: g.estado,
    cliente: clienteNombre || "Cliente",
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
  });
  const formatFecha = (value) => {
    if (!value) return "Sin fecha";
    try {
      return new Date(value).toLocaleDateString("es-AR");
    } catch {
      return value;
    }
  };

  if (pendientes.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Pedidos futuros</span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            padding: "12px 16px",
          }}
        >
          No hay pedidos futuros para este cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">Pedidos futuros</span>
      </div>
      {pedidosClienteAgrupados.filter((g) => {
        if (!g.fecha_entrega) return g.estado !== "entregado";
        return g.fecha_entrega >= hoyStr && g.estado !== "entregado";
      }).length > 0 && (
        <div>
          {pedidosClienteAgrupados
            .filter((g) => {
              if (!g.fecha_entrega) return g.estado !== "entregado";
              return g.fecha_entrega >= hoyStr && g.estado !== "entregado";
            })
            .map((g) => {
              const unidades = (g.items || []).reduce(
                (s, it) => s + (it.cantidad || 0),
                0,
              );
              return (
                <div
                  key={g.key}
                  className="venta-item venta-item-simple"
                  style={{ padding: "10px 16px" }}
                >
                  <div
                    className="insumo-info"
                    style={{ flex: 1 }}
                  >
                    <div className="insumo-nombre">
                      {formatFecha(g.fecha_entrega)} ·{" "}
                      {getPedidoEstadoLabel(g.estado)}
                    </div>
                    <div
                      className="insumo-detalle"
                      style={{ fontSize: 12 }}
                    >
                      {unidades} u ·{" "}
                      {(g.items || [])
                        .map((it) => {
                          const receta = recetas.find(
                            (r) => r.id === it.receta_id,
                          );
                          return `${it.cantidad || 0}x ${
                            receta?.nombre || "Producto"
                          }`;
                        })
                        .join(" · ")}
                    </div>
                  </div>
                  <div
                    className="insumo-precio"
                    style={{ minWidth: 120 }}
                  >
                    <div className="insumo-precio-value">
                      {fmt(g.total)}
                    </div>
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
                    <select
                      className="form-input"
                      value={g.estado || "pendiente"}
                      onChange={(e) =>
                        actualizarEstadoPedido(g, e.target.value)
                      }
                      aria-label="Estado del pedido"
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        padding: "4px 6px",
                      }}
                      disabled={g.estado === "entregado"}
                    >
                      <option value="pendiente">
                        {getPedidoEstadoLabel("pendiente")}
                      </option>
                      <option value="en_preparacion">
                        {getPedidoEstadoLabel("en_preparacion")}
                      </option>
                      <option value="listo">
                        {getPedidoEstadoLabel("listo")}
                      </option>
                      <option value="entregado">
                        {getPedidoEstadoLabel("entregado")}
                      </option>
                    </select>
                    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          flex: 1,
                        }}
                        onClick={() => marcarPedidoEntregado(g)}
                        disabled={savingEntrega}
                      >
                        Marcar entregado
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
        </div>
      )}

      {sharePedido && (
        <ShareTicketModal
          type="pedido"
          data={buildShareData(sharePedido)}
          onClose={() => setSharePedido(null)}
        />
      )}
    </div>
  );
}

export default ClienteDetallePedidos;
