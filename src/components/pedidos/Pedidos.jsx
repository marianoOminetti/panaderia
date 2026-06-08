import { useState, useRef } from "react";
import { hoyLocalISO } from "../../lib/dates";
import { reportError } from "../../utils/errorReport";
import { useClientes } from "../../hooks/useClientes";
import { useVentas, releaseVentaTransaccionClaim } from "../../hooks/useVentas";
import { enqueueVentaWrite } from "../../lib/ventaWriteQueue";
import PedidosList from "./PedidosList";
import PedidosListFilters from "./PedidosListFilters";

function buildStockDeltasFromPedidoItems(items) {
  return items
    .filter((p) => p.receta_id && (p.cantidad || 0) > 0)
    .map((p) => ({ receta_id: p.receta_id, delta: -(p.cantidad || 0) }));
}

function withPendingVentaIds(rows, transaccionId) {
  const now = new Date().toISOString();
  return rows.map((r, i) => ({
    ...r,
    id: `pending-${transaccionId}-${i}`,
    created_at: now,
  }));
}

export default function Pedidos({
  recetas,
  pedidos,
  clientes,
  stock,
  actualizarStock,
  actualizarStockBatch,
  onRefresh,
  appendVentas,
  patchStock,
  removeVentas,
  resolveOptimisticVentas,
  updatePedidosEstado,
  removePedidosByPedidoIdInState,
  showToast,
  confirm,
  onOpenNuevoPedido,
}) {
  const [search, setSearch] = useState("");
  const entregaInFlightRef = useRef(new Set());

  const { updatePedidoEntregado, deletePedidosByPedidoId } = useClientes({
    onRefresh,
    showToast,
    updatePedidosEstado,
    removePedidosByPedidoIdInState,
  });

  const { insertVentas, deleteVentas } = useVentas();

  const handleChangeEstado = async () => {
    // Estados simplificados: no se cambia estado desde dropdown, solo por acciones.
  };

  const handleMarcarEntregado = async (grupo) => {
    if (!grupo || !grupo.rawItems?.length) return;
    if (entregaInFlightRef.current.has(grupo.key)) {
      showToast?.("Registrando entrega anterior…");
      return;
    }
    const ok = await confirm?.(
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
    const pendingRows = withPendingVentaIds(rows, transaccionId);
    const pendingIds = pendingRows.map((r) => r.id);
    const stockDeltas = buildStockDeltasFromPedidoItems(grupo.rawItems);
    const estadoAnterior = grupo.estado || "pendiente";

    appendVentas?.(pendingRows);
    patchStock?.(stockDeltas);
    updatePedidosEstado?.(grupo.key, "entregado");
    showToast?.("Registrando entrega…");

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
              await deleteVentas(insertedIds);
            } catch (rollbackErr) {
              reportError(rollbackErr, {
                action: "rollbackVentasAfterPedidoEntregadoFailFromMAS",
              });
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
        action: "marcarPedidoEntregadoDesdeMAS",
        pedido_id: grupo?.key,
      });
      showToast?.("⚠️ No se pudo marcar el pedido como entregado");
    } finally {
      entregaInFlightRef.current.delete(grupo.key);
    }
  };

  const handleCancelar = async (grupo) => {
    if (!grupo?.key) return;
    const ok = await confirm?.(
      "¿Cancelar este pedido?\nSe va a borrar y no contará en Analytics ni en la planificación.",
    );
    if (!ok) return;
    try {
      await deletePedidosByPedidoId(grupo.key);
    } catch {
      showToast?.("⚠️ No se pudo cancelar el pedido");
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button
          type="button"
          className="screen-back"
          onClick={() => {
            if (typeof window !== "undefined" && window.history?.length > 1) {
              window.history.back();
            }
          }}
        >
          ← Volver
        </button>
        <span className="screen-title">Pedidos</span>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <span className="card-title">Resumen de próximos pedidos</span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              padding: "8px 16px 12px",
            }}
          >
            Gestioná todos los pedidos futuros: cambiá estados, cancelá los que no
            se van a hacer y compartí el detalle por WhatsApp.
          </p>
        </div>

        <PedidosListFilters
          search={search}
          onSearchChange={setSearch}
        />

        <PedidosList
          pedidos={pedidos}
          recetas={recetas}
          clientes={clientes}
          search={search}
          estadoFilter=""
          soloProximos={false}
          onChangeEstado={handleChangeEstado}
          onMarcarEntregado={handleMarcarEntregado}
          onCancelar={handleCancelar}
          onOpenNuevoPedido={onOpenNuevoPedido}
        />
      </div>
    </div>
  );
}
