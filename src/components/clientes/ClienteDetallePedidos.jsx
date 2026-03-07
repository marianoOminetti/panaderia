import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import { FormInput, FormMoneyInput, SearchableSelect, DatePicker } from "../ui";

function ClienteDetallePedidos({
  pedidosClienteAgrupados,
  recetas,
  nuevoPedidoAbierto,
  setNuevoPedidoAbierto,
  pedidoForm,
  savingEntrega,
  actualizarEstadoPedido,
  marcarPedidoEntregado,
}) {
  const {
    fechaEntrega,
    setFechaEntrega,
    recetaSel,
    setRecetaSel,
    cantidad,
    setCantidad,
    precio,
    setPrecio,
    items,
    senia,
    setSenia,
    estado,
    setEstado,
    saving,
    addItem,
    quitarItem,
    guardar,
  } = pedidoForm;

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
  const estadoLabel = (estadoVal) => {
    if (estadoVal === "en_preparacion") return "En preparación";
    if (estadoVal === "listo") return "Listo";
    if (estadoVal === "entregado") return "Entregado";
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
          <DatePicker
            label="Fecha de entrega"
            value={fechaEntrega}
            onChange={setFechaEntrega}
          />
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Producto</label>
              <SearchableSelect
                options={[
                  { value: "", label: "Elegí un producto" },
                  ...recetas.map((r) => ({
                    value: r.id,
                    label: `${r.emoji || ""} ${r.nombre}`.trim(),
                  })),
                ]}
                value={recetaSel}
                onChange={setRecetaSel}
                placeholder="Buscar producto..."
              />
            </div>
            <FormInput
              label="Cantidad"
              type="number"
              min={1}
              value={cantidad}
              onChange={(v) => setCantidad(Number(v) || 1)}
              style={{ flex: 1 }}
            />
          </div>
          <FormMoneyInput
            label="Precio acordado por unidad (opcional)"
            value={precio}
            onChange={setPrecio}
            placeholder="Precio de lista"
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={addItem}
            style={{ marginBottom: 8 }}
          >
            Agregar ítem
          </button>
          {items.length > 0 && (
            <div className="pedido-items-preview">
              {items.map((it) => (
                <div key={it.receta.id} className="pedido-item-row">
                  <span>
                    {it.cantidad}x {it.receta.nombre}
                  </span>
                  <span>
                    {fmt((it.precio_unitario || 0) * (it.cantidad || 0))}
                  </span>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => quitarItem(it.receta.id)}
                    style={{ color: "var(--text-muted)" }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="form-row">
            <FormMoneyInput
              label="Seña / adelanto"
              value={senia}
              onChange={setSenia}
              placeholder="0"
            />
            <div className="form-group">
              <label className="form-label">Estado inicial</label>
              <SearchableSelect
                options={[
                  { value: "pendiente", label: "Pendiente" },
                  { value: "en_preparacion", label: "En preparación" },
                  { value: "listo", label: "Listo" },
                ]}
                value={estado}
                onChange={setEstado}
                placeholder="Estado"
              />
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => guardar()}
            disabled={
              saving ||
              items.length === 0 ||
              !fechaEntrega
            }
          >
            {saving ? "Guardando…" : "Guardar pedido"}
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
                      aria-label="Estado del pedido"
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
                      disabled={savingEntrega}
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
