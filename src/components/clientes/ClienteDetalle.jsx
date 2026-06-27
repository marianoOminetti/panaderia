/**
 * Detalle de un cliente: pedidos (ClienteDetallePedidos) y ventas (ClienteDetalleVentas), alta de pedido y acciones.
 * Usa useClientes para operaciones de estado.
 */
import { useRef } from "react";
import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import { agruparPedidos, agruparVentas } from "../../lib/agrupadores";
import { reportError } from "../../utils/errorReport";
import { useClientes } from "../../hooks/useClientes";
import { useVentas, releaseVentaTransaccionClaim } from "../../hooks/useVentas";
import { enqueueVentaWrite } from "../../lib/ventaWriteQueue";
import ClienteDetallePedidos from "./ClienteDetallePedidos";
import ClienteDetalleVentas from "./ClienteDetalleVentas";
import ClientePerfilCompra from "./ClientePerfilCompra";
import ClienteWhatsAppButton from "./ClienteWhatsAppButton";
import { deudaCliente } from "../../lib/clienteDeuda";

function ClienteDetalle({
  cliente,
  ventas,
  recetas,
  pedidos,
  perfil,
  onClose,
  actualizarStock,
  actualizarStockBatch,
  showToast,
  confirm,
  onRefresh,
  updateClienteInState,
  appendVentas,
  patchStock,
  removeVentas,
  resolveOptimisticVentas,
  updatePedidosEstado,
}) {
  const entregaInFlightRef = useRef(new Set());
  const {
    updatePedidoEstado,
    updatePedidoEntregado,
    deleteVentasByIds,
    softDeleteCliente,
  } = useClientes({ onRefresh, showToast, updateClienteInState, updatePedidosEstado });
  const { insertVentas } = useVentas();

  if (!cliente) return null;

  const deuda = deudaCliente(ventas, cliente.id);

  const getVentasDeCliente = (clienteId) =>
    ventas.filter((v) => v.cliente_id === clienteId);

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
    if (entregaInFlightRef.current.has(grupo.key)) {
      showToast("Registrando entrega anterior…");
      return;
    }
    const ok = await confirm(
      "¿Marcar este pedido como entregado? Se registrará la venta y se descontará el stock.",
      { destructive: false },
    );
    if (!ok) return;

    entregaInFlightRef.current.add(grupo.key);
    const hoy = hoyLocalISO();
    const transaccionId = crypto.randomUUID?.() || `p-${grupo.key}`;
    const rows = grupo.rawItems.map((p) => {
      const precio = p.precio_unitario || 0;
      const cantidad = p.cantidad || 0;
      const subtotal = precio * cantidad;
      return {
        receta_id: p.receta_id,
        cantidad,
        precio_unitario: precio,
        subtotal,
        descuento: 0,
        total_final: subtotal,
        fecha: hoy,
        transaccion_id: transaccionId,
        cliente_id: p.cliente_id || null,
        medio_pago: "efectivo",
        estado_pago: "pagado",
      };
    });
    const now = new Date().toISOString();
    const pendingRows = rows.map((r, i) => ({
      ...r,
      id: `pending-${transaccionId}-${i}`,
      created_at: now,
    }));
    const pendingIds = pendingRows.map((r) => r.id);
    const stockDeltas = grupo.rawItems
      .filter((p) => p.receta_id && (p.cantidad || 0) > 0)
      .map((p) => ({ receta_id: p.receta_id, delta: -(p.cantidad || 0) }));
    const estadoAnterior = grupo.estado || "pendiente";

    appendVentas?.(pendingRows);
    patchStock?.(stockDeltas);
    updatePedidosEstado?.(grupo.key, "entregado");
    showToast("Registrando entrega…");

    try {
      await enqueueVentaWrite(async () => {
        let inserted = [];
        let insertedIds = [];
        try {
          inserted = await insertVentas(rows, { source: "pedido_entrega" });
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
          if (transaccionId) {
            await releaseVentaTransaccionClaim(transaccionId);
          }
          throw ventaErr;
        }
        if (actualizarStockBatch && stockDeltas.length) {
          await actualizarStockBatch(stockDeltas, { useLocalBase: true });
        }
        if (resolveOptimisticVentas) {
          resolveOptimisticVentas(transaccionId, inserted || [], pendingIds);
        } else {
          removeVentas?.(pendingIds);
          appendVentas?.(inserted || []);
        }
      });
    } catch (err) {
      removeVentas?.(pendingIds);
      patchStock?.(stockDeltas.map((d) => ({ ...d, delta: -d.delta })));
      updatePedidosEstado?.(grupo.key, estadoAnterior);
      await onRefresh?.();
      reportError(err, {
        action: "marcarPedidoEntregado",
        pedido_id: grupo?.key,
      });
      showToast("⚠️ No se pudo marcar el pedido como entregado");
    } finally {
      entregaInFlightRef.current.delete(grupo.key);
    }
  };

  const pedidosClienteAgrupados = agruparPedidos(
    (pedidos || []).filter((p) => p.cliente_id === cliente.id),
  );

  const handleEliminarCliente = async () => {
    const ok = await confirm(
      "¿Dar de baja este cliente? No se borran ventas ni pedidos; solo dejará de aparecer en la lista.",
      { destructive: true },
    );
    if (!ok) return;
    try {
      await softDeleteCliente(cliente.id);
      onClose();
    } catch (err) {
      reportError(err, { action: "softDeleteCliente", clienteId: cliente.id });
      const msg =
        err?.message && /eliminado|column/i.test(String(err.message))
          ? "No se pudo dar de baja. Verificá que la migración de clientes esté aplicada."
          : "⚠️ No se pudo dar de baja el cliente";
      showToast(msg);
    }
  };

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button
          className="screen-back"
          onClick={() => {
            onClose();
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
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {cliente.telefono?.trim() && perfil?.inactivo && (
                <ClienteWhatsAppButton
                  cliente={cliente}
                  diasDesdeUltima={perfil?.diasDesdeUltima}
                  favoritoNombre={perfil?.favoritos?.[0]?.receta?.nombre}
                  showToast={showToast}
                />
              )}
              <button
                type="button"
                className="edit-btn"
                onClick={handleEliminarCliente}
                style={{ fontSize: 13, fontWeight: 500, color: "var(--danger)" }}
                aria-label="Dar de baja cliente"
              >
                Dar de baja
              </button>
            </div>
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
          {deuda > 0 && (
            <p className="clientes-deuda-resumen">
              <strong>Deuda pendiente:</strong> {fmt(deuda)}
            </p>
          )}
          {(() => {
            const vs = getVentasDeCliente(cliente.id);
            const grupos = agruparVentas(vs);
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
                  <strong>Compras:</strong> {grupos.length}
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

        <ClientePerfilCompra perfil={perfil} />

        <ClienteDetallePedidos
          pedidosClienteAgrupados={pedidosClienteAgrupados}
          recetas={recetas}
          savingEntrega={false}
          actualizarEstadoPedido={actualizarEstadoPedido}
          marcarPedidoEntregado={marcarPedidoEntregado}
          clienteNombre={cliente.nombre}
        />

        <ClienteDetalleVentas
          ventasCliente={getVentasDeCliente(cliente.id)}
          recetas={recetas}
        />
      </div>
    </div>
  );
}

export default ClienteDetalle;
