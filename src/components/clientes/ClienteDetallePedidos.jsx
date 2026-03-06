import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";

function ClienteDetallePedidos({
  pedidosClienteAgrupados,
  recetas,
  nuevoPedidoAbierto,
  setNuevoPedidoAbierto,
  pedidoFechaEntrega,
  setPedidoFechaEntrega,
  pedidoRecetaSel,
  setPedidoRecetaSel,
  pedidoCantidad,
  setPedidoCantidad,
  pedidoPrecio,
  setPedidoPrecio,
  pedidoItems,
  pedidoSenia,
  setPedidoSenia,
  pedidoEstado,
  setPedidoEstado,
  savingPedido,
  addPedidoItem,
  quitarPedidoItem,
  guardarPedido,
  actualizarEstadoPedido,
  marcarPedidoEntregado,
}) {
  const hoyStr = hoyLocalISO();
  const pendientes = pedidosClienteAgrupados.filter((g) => {
    if (!g.fecha_entrega) return g.estado !== "entregado";
    return g.fecha_entrega >= hoyStr && g.estado !== "entregado";
  });
  const formatFecha = (value) => {
    if (!value) return "Sin fecha";
    try {
      return new Date(value).toLocaleDateString("es-AR");
    } catch {
      return value;
    }
  };
  const estadoLabel = (estado) => {
    if (estado === "en_preparacion") return "En preparación";
    if (estado === "listo") return "Listo";
    if (estado === "entregado") return "Entregado";
    return "Pendiente";
  };

  if (!nuevoPedidoAbierto && pendientes.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Pedidos futuros</span>
          <button
            type="button"
            className="card-link"
            onClick={() => setNuevoPedidoAbierto((prev) => !prev)}
          >
            {nuevoPedidoAbierto ? "Cerrar" : "+ Nuevo pedido"}
          </button>
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
        <button
          type="button"
          className="card-link"
          onClick={() => setNuevoPedidoAbierto((prev) => !prev)}
        >
          {nuevoPedidoAbierto ? "Cerrar" : "+ Nuevo pedido"}
        </button>
      </div>
      {nuevoPedidoAbierto && (
        <div
          style={{
            padding: "12px 16px",
            borderTop:
              pendientes.length > 0
                ? "1px solid var(--border)"
                : "none",
          }}
        >
          <div className="form-group">
            <label className="form-label">Fecha de entrega</label>
            <input
              className="form-input"
              type="date"
              value={pedidoFechaEntrega}
              min={hoyLocalISO()}
              onChange={(e) => setPedidoFechaEntrega(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Producto</label>
              <select
                className="form-select"
                value={pedidoRecetaSel}
                onChange={(e) => setPedidoRecetaSel(e.target.value)}
              >
                <option value="">Elegí un producto</option>
                {recetas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Cantidad</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={pedidoCantidad}
                onChange={(e) =>
                  setPedidoCantidad(Number(e.target.value) || 1)
                }
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              Precio acordado por unidad ($)
            </label>
            <input
              className="form-input"
              type="number"
              value={pedidoPrecio}
              onChange={(e) => setPedidoPrecio(e.target.value)}
              placeholder="Dejar vacío para usar precio de lista"
            />
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={addPedidoItem}
            style={{ marginBottom: 8 }}
          >
            Agregar ítem
          </button>
          {pedidoItems.length > 0 && (
            <div
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              {pedidoItems.map((it) => (
                <div
                  key={it.receta.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "4px 0",
                  }}
                >
                  <span>
                    {it.cantidad}x {it.receta.nombre}
                  </span>
                  <span>
                    {fmt(
                      (it.precio_unitario || 0) * (it.cantidad || 0),
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => quitarPedidoItem(it.receta.id)}
                    style={{
                      border: "none",
                      background: "none",
                      color: "#999",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Seña / adelanto ($)</label>
              <input
                className="form-input"
                type="number"
                value={pedidoSenia}
                onChange={(e) => setPedidoSenia(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Estado inicial</label>
              <select
                className="form-select"
                value={pedidoEstado}
                onChange={(e) => setPedidoEstado(e.target.value)}
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_preparacion">En preparación</option>
                <option value="listo">Listo</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={guardarPedido}
            disabled={
              savingPedido ||
              pedidoItems.length === 0 ||
              !pedidoFechaEntrega
            }
          >
            {savingPedido ? "Guardando…" : "Guardar pedido"}
          </button>
        </div>
      )}
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
                      {estadoLabel(g.estado)}
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
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        padding: "4px 6px",
                      }}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_preparacion">
                        En preparación
                      </option>
                      <option value="listo">Listo</option>
                    </select>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        padding: "4px 8px",
                      }}
                      onClick={() => marcarPedidoEntregado(g)}
                      disabled={savingPedido}
                    >
                      Marcar entregado
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default ClienteDetallePedidos;
