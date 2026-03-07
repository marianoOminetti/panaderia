/**
 * Detalle de un cliente: pedidos (ClienteDetallePedidos) y ventas (ClienteDetalleVentas), alta de pedido y acciones.
 * Usa usePedidoForm para formulario de nuevo pedido, useClientes para operaciones de estado.
 */
import { useState } from "react";
import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import { agruparPedidos } from "../../lib/agrupadores";
import { reportError } from "../../utils/errorReport";
import { useClientes } from "../../hooks/useClientes";
import { usePedidoForm } from "../../hooks/usePedidoForm";
import ClienteDetallePedidos from "./ClienteDetallePedidos";
import ClienteDetalleVentas from "./ClienteDetalleVentas";

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
  const [savingEntrega, setSavingEntrega] = useState(false);

  const pedidoForm = usePedidoForm({
    recetas,
    clienteId: cliente?.id,
    insertPedidos,
    showToast,
    onSuccess: () => setNuevoPedidoAbierto(false),
  });

  if (!cliente) return null;

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
    const ok = await confirm(
      "¿Marcar este pedido como entregado? Se registrará la venta y se descontará el stock.",
      { destructive: false },
    );
    if (!ok) return;
    setSavingEntrega(true);
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
        throw ventaErr;
      }
      if (actualizarStock) {
        for (const p of grupo.rawItems) {
          const cant = p.cantidad || 0;
          if (!p.receta_id || cant <= 0) continue;
          await actualizarStock(p.receta_id, -cant);
        }
      }
    } catch (err) {
      reportError(err, {
        action: "marcarPedidoEntregado",
        pedido_id: grupo?.key,
      });
      showToast("⚠️ No se pudo marcar el pedido como entregado");
    } finally {
      setSavingEntrega(false);
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
            pedidoForm.reset();
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

        <ClienteDetallePedidos
          pedidosClienteAgrupados={pedidosClienteAgrupados}
          recetas={recetas}
          nuevoPedidoAbierto={nuevoPedidoAbierto}
          setNuevoPedidoAbierto={setNuevoPedidoAbierto}
          pedidoForm={pedidoForm}
          savingEntrega={savingEntrega}
          actualizarEstadoPedido={actualizarEstadoPedido}
          marcarPedidoEntregado={marcarPedidoEntregado}
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
