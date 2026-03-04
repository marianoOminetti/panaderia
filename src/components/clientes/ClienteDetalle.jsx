import { useState } from "react";
import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import { agruparPedidos } from "../../lib/agrupadores";
import { reportError } from "../../utils/errorReport";
import { useClientes } from "../../hooks/useClientes";

function ClienteDetalle({
  cliente,
  ventas,
  recetas,
  pedidos,
  onClose,
  actualizarStock,
  showToast,
  confirm,
  onRefresh,
}) {
  const {
    insertPedidos,
    updatePedidoEstado,
    insertVentas,
    updatePedidoEntregado,
    deleteVentasByIds,
  } = useClientes({ onRefresh, showToast });

  const [nuevoPedidoAbierto, setNuevoPedidoAbierto] = useState(false);
  const [pedidoFechaEntrega, setPedidoFechaEntrega] = useState("");
  const [pedidoRecetaSel, setPedidoRecetaSel] = useState("");
  const [pedidoCantidad, setPedidoCantidad] = useState(1);
  const [pedidoPrecio, setPedidoPrecio] = useState("");
  const [pedidoItems, setPedidoItems] = useState([]);
  const [pedidoSenia, setPedidoSenia] = useState("");
  const [pedidoEstado, setPedidoEstado] = useState("pendiente");
  const [savingPedido, setSavingPedido] = useState(false);

  if (!cliente) return null;

  const getVentasDeCliente = (clienteId) =>
    ventas.filter((v) => v.cliente_id === clienteId);

  const resetFormularioPedido = () => {
    setPedidoFechaEntrega("");
    setPedidoRecetaSel("");
    setPedidoCantidad(1);
    setPedidoPrecio("");
    setPedidoItems([]);
    setPedidoSenia("");
    setPedidoEstado("pendiente");
  };

  const addPedidoItem = () => {
    if (!pedidoRecetaSel) return;
    const receta = recetas.find(
      (r) => String(r.id) === String(pedidoRecetaSel),
    );
    if (!receta) return;
    const cantidadNum = Number(pedidoCantidad) || 0;
    if (cantidadNum <= 0) return;
    const precioNum =
      pedidoPrecio !== ""
        ? Number(String(pedidoPrecio).replace(",", "."))
        : Number(receta.precio_venta || 0);
    if (Number.isNaN(precioNum) || precioNum < 0) return;
    setPedidoItems((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          cantidad: copy[idx].cantidad + cantidadNum,
          precio_unitario: precioNum,
        };
        return copy;
      }
      return [
        ...prev,
        { receta, cantidad: cantidadNum, precio_unitario: precioNum },
      ];
    });
    setPedidoRecetaSel("");
    setPedidoCantidad(1);
    setPedidoPrecio("");
  };

  const quitarPedidoItem = (recetaId) => {
    setPedidoItems((prev) => prev.filter((it) => it.receta.id !== recetaId));
  };

  const guardarPedido = async () => {
    if (!pedidoFechaEntrega) {
      showToast("Elegí una fecha de entrega");
      return;
    }
    if (pedidoItems.length === 0) {
      showToast("Agregá al menos un producto");
      return;
    }
    setSavingPedido(true);
    try {
      const pedidoId = crypto.randomUUID?.() || `p-${Date.now()}`;
      const seniaNum =
        parseFloat(String(pedidoSenia || "").replace(",", ".")) || 0;
      const rows = pedidoItems.map((item) => {
        const precio =
          parseFloat(String(item.precio_unitario).replace(",", ".")) || 0;
        const cantidad = Number(item.cantidad) || 0;
        return {
          pedido_id: pedidoId,
          cliente_id: cliente.id,
          receta_id: item.receta.id,
          cantidad,
          precio_unitario: precio,
          senia: seniaNum,
          estado: pedidoEstado,
          fecha_entrega: pedidoFechaEntrega,
        };
      });
      try {
        await insertPedidos(rows);
      } catch (error) {
        reportError(error, {
          action: "guardarPedidoCliente",
          cliente_id: cliente.id,
        });
        showToast("⚠️ Error al guardar pedido");
        setSavingPedido(false);
        return;
      }
      resetFormularioPedido();
      setNuevoPedidoAbierto(false);
    } catch (err) {
      reportError(err, {
        action: "guardarPedidoCliente",
        cliente_id: cliente?.id,
      });
      showToast("⚠️ Error al guardar pedido");
    } finally {
      setSavingPedido(false);
    }
  };

  const actualizarEstadoPedido = async (grupo, nuevoEstado) => {
    if (!grupo || !nuevoEstado || grupo.estado === nuevoEstado) return;
    try {
      await updatePedidoEstado(grupo.key, nuevoEstado);
    } catch (err) {
      reportError(err, {
        action: "actualizarEstadoPedido",
        pedido_id: grupo?.key,
      });
      showToast("⚠️ Error al actualizar estado del pedido");
    }
  };

  const marcarPedidoEntregado = async (grupo) => {
    if (!grupo || !grupo.rawItems?.length) return;
    const ok = await confirm(
      "¿Marcar este pedido como entregado? Se registrará la venta y se descontará el stock.",
      { destructive: false },
    );
    if (!ok) return;
    setSavingPedido(true);
    try {
      const hoy = hoyLocalISO();
      const transaccionId = crypto.randomUUID?.() || `p-${grupo.key}`;
      const rows = grupo.rawItems.map((p) => {
        const precio = p.precio_unitario || 0;
        const cantidad = p.cantidad || 0;
        const subtotal = precio * cantidad;
        const descuento = 0;
        const total_final = subtotal - descuento;
        return {
          receta_id: p.receta_id,
          cantidad,
          precio_unitario: precio,
          subtotal,
          descuento,
          total_final,
          fecha: hoy,
          transaccion_id: transaccionId,
          cliente_id: p.cliente_id || null,
          medio_pago: "efectivo",
          estado_pago: "pagado",
        };
      });
      if (actualizarStock) {
        for (const p of grupo.rawItems) {
          const cant = p.cantidad || 0;
          if (!p.receta_id || cant <= 0) continue;
          await actualizarStock(p.receta_id, -cant);
        }
      }
      let insertedIds = [];
      try {
        const inserted = await insertVentas(rows);
        insertedIds = (inserted || []).map((r) => r.id).filter(Boolean);
        await updatePedidoEntregado(grupo.key);
      } catch (ventaErr) {
        if (insertedIds.length > 0) {
          try {
            await deleteVentasByIds(insertedIds);
          } catch (rollbackErr) {
            reportError(rollbackErr, { action: "rollbackVentasAfterPedidoEntregadoFail" });
          }
        }
        if (actualizarStock) {
          try {
            for (const p of grupo.rawItems) {
              const cant = p.cantidad || 0;
              if (!p.receta_id || cant <= 0) continue;
              await actualizarStock(p.receta_id, cant);
            }
          } catch (rollbackErr) {
            reportError(rollbackErr, { action: "rollbackStockAfterPedidoEntregadoFail" });
          }
        }
        throw ventaErr;
      }
    } catch (err) {
      reportError(err, {
        action: "marcarPedidoEntregado",
        pedido_id: grupo?.key,
      });
      showToast("⚠️ No se pudo marcar el pedido como entregado");
    } finally {
      setSavingPedido(false);
    }
  };

  const pedidosClienteAgrupados = agruparPedidos(
    (pedidos || []).filter((p) => p.cliente_id === cliente.id),
  );

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button
          className="screen-back"
          onClick={() => {
            onClose();
            setNuevoPedidoAbierto(false);
            resetFormularioPedido();
          }}
        >
          ← Volver
        </button>
        <span className="screen-title">{cliente.nombre}</span>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Resumen</span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            <strong>Teléfono:</strong> {cliente.telefono || "—"}
          </p>
          {(() => {
            const vs = getVentasDeCliente(cliente.id);
            const total = vs.reduce((s, v) => {
              const linea =
                v.total_final != null
                  ? v.total_final
                  : (v.precio_unitario || 0) * (v.cantidad || 0);
              return s + linea;
            }, 0);
            return (
              <>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                  }}
                >
                  <strong>Compras:</strong> {vs.length}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  <strong>Total gastado:</strong> {fmt(total)}
                </p>
              </>
            );
          })()}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Pedidos futuros</span>
            <button
              type="button"
              className="card-link"
              onClick={() =>
                setNuevoPedidoAbierto((prev) => !prev)
              }
            >
              {nuevoPedidoAbierto ? "Cerrar" : "+ Nuevo pedido"}
            </button>
          </div>
          {(() => {
            const hoyStr = hoyLocalISO();
            const pendientes = pedidosClienteAgrupados.filter((g) => {
              if (!g.fecha_entrega) return g.estado !== "entregado";
              return (
                g.fecha_entrega >= hoyStr && g.estado !== "entregado"
              );
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
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    padding: "12px 16px",
                  }}
                >
                  No hay pedidos futuros para este cliente.
                </p>
              );
            }
            return (
              <>
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
                      <label className="form-label">
                        Fecha de entrega
                      </label>
                      <input
                        className="form-input"
                        type="date"
                        value={pedidoFechaEntrega}
                        min={hoyLocalISO()}
                        onChange={(e) =>
                          setPedidoFechaEntrega(e.target.value)
                        }
                      />
                    </div>
                    <div className="form-row">
                      <div
                        className="form-group"
                        style={{ flex: 2 }}
                      >
                        <label className="form-label">Producto</label>
                        <select
                          className="form-select"
                          value={pedidoRecetaSel}
                          onChange={(e) =>
                            setPedidoRecetaSel(e.target.value)
                          }
                        >
                          <option value="">
                            Elegí un producto
                          </option>
                          {recetas.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div
                        className="form-group"
                        style={{ flex: 1 }}
                      >
                        <label className="form-label">
                          Cantidad
                        </label>
                        <input
                          className="form-input"
                          type="number"
                          min="1"
                          value={pedidoCantidad}
                          onChange={(e) =>
                            setPedidoCantidad(
                              Number(e.target.value) || 1,
                            )
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
                        onChange={(e) =>
                          setPedidoPrecio(e.target.value)
                        }
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
                                (it.precio_unitario || 0) *
                                  (it.cantidad || 0),
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                quitarPedidoItem(it.receta.id)
                              }
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
                      <div
                        className="form-group"
                        style={{ flex: 1 }}
                      >
                        <label className="form-label">
                          Seña / adelanto ($)
                        </label>
                        <input
                          className="form-input"
                          type="number"
                          value={pedidoSenia}
                          onChange={(e) =>
                            setPedidoSenia(e.target.value)
                          }
                          placeholder="0"
                        />
                      </div>
                      <div
                        className="form-group"
                        style={{ flex: 1 }}
                      >
                        <label className="form-label">
                          Estado inicial
                        </label>
                        <select
                          className="form-select"
                          value={pedidoEstado}
                          onChange={(e) =>
                            setPedidoEstado(e.target.value)
                          }
                        >
                          <option value="pendiente">
                            Pendiente
                          </option>
                          <option value="en_preparacion">
                            En preparación
                          </option>
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
                      {savingPedido
                        ? "Guardando…"
                        : "Guardar pedido"}
                    </button>
                  </div>
                )}
                {pedidosClienteAgrupados.filter((g) => {
                  if (!g.fecha_entrega) return g.estado !== "entregado";
                  const hoyStrLocal = hoyLocalISO();
                  return (
                    g.fecha_entrega >= hoyStrLocal &&
                    g.estado !== "entregado"
                  );
                }).length > 0 && (
                  <div>
                    {pedidosClienteAgrupados
                      .filter((g) => {
                        if (!g.fecha_entrega)
                          return g.estado !== "entregado";
                        const hoyStrLocal = hoyLocalISO();
                        return (
                          g.fecha_entrega >= hoyStrLocal &&
                          g.estado !== "entregado"
                        );
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
                                      (r) =>
                                        r.id === it.receta_id,
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
                                  actualizarEstadoPedido(
                                    g,
                                    e.target.value,
                                  )
                                }
                                style={{
                                  marginTop: 6,
                                  fontSize: 11,
                                  padding: "4px 6px",
                                }}
                              >
                                <option value="pendiente">
                                  Pendiente
                                </option>
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
                                onClick={() =>
                                  marcarPedidoEntregado(g)
                                }
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
              </>
            );
          })()}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Historial de compras</span>
          </div>
          {(() => {
            const vs = getVentasDeCliente(cliente.id).sort((a, b) =>
              (a.fecha || "") > (b.fecha || "")
                ? -1
                : (a.fecha || "") < (b.fecha || "")
                ? 1
                : 0,
            );
            if (vs.length === 0) {
              return (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    padding: "12px 16px",
                  }}
                >
                  No hay compras registradas para este cliente.
                </p>
              );
            }
            return vs.map((v) => {
              const receta = recetas.find(
                (r) => r.id === v.receta_id,
              );
              const totalLinea =
                v.total_final != null
                  ? v.total_final
                  : (v.precio_unitario || 0) *
                    (v.cantidad || 0);
              let fechaLabel = v.fecha;
              try {
                if (v.fecha) {
                  fechaLabel = new Date(
                    v.fecha,
                  ).toLocaleDateString("es-AR");
                }
              } catch {
                // ignore parse errors
              }
              return (
                <div key={v.id} className="venta-item">
                  <div
                    className="insumo-info"
                    style={{ flex: 1 }}
                  >
                    <div className="insumo-nombre">
                      {receta?.nombre || "Producto"}
                    </div>
                    <div className="insumo-detalle">
                      {fechaLabel} · {v.cantidad} u
                    </div>
                  </div>
                  <div className="insumo-precio">
                    <div className="insumo-precio-value">
                      {fmt(totalLinea)}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

export default ClienteDetalle;

