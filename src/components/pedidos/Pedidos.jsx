import { useState } from "react";
import { hoyLocalISO } from "../../lib/dates";
import { reportError } from "../../utils/errorReport";
import { useClientes } from "../../hooks/useClientes";
import { useVentas } from "../../hooks/useVentas";
import PedidosList from "./PedidosList";
import PedidosListFilters from "./PedidosListFilters";

export default function Pedidos({
  recetas,
  pedidos,
  clientes,
  stock,
  actualizarStock,
  onRefresh,
  showToast,
  confirm,
  onOpenNuevoPedido,
}) {
  const [search, setSearch] = useState("");

  const {
    updatePedidoEstado,
    updatePedidoEntregado,
    deletePedidosByPedidoId,
  } = useClientes({
    onRefresh,
    showToast,
  });

  const { insertVentas, deleteVentas } = useVentas();

  const handleChangeEstado = async () => {
    // Estados simplificados: no se cambia estado desde dropdown, solo por acciones.
  };

  const handleMarcarEntregado = async (grupo) => {
    if (!grupo || !grupo.rawItems?.length) return;
    const ok = await confirm?.(
      "¿Marcar este pedido como entregado? Se registrará la venta y se descontará el stock.",
      { destructive: false },
    );
    if (!ok) return;
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
            await deleteVentas(insertedIds);
          } catch (rollbackErr) {
            reportError(rollbackErr, {
              action: "rollbackVentasAfterPedidoEntregadoFailFromMAS",
            });
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
        action: "marcarPedidoEntregadoDesdeMAS",
        pedido_id: grupo?.key,
      });
      showToast?.("⚠️ No se pudo marcar el pedido como entregado");
    }
  };

  const handleCancelar = async (grupo) => {
    if (!grupo?.key) return;
    const ok = await confirm?.(
      "¿Cancelar este pedido?\nSe va a borrar y no contará en Analytics ni en la planificación.",
    );
    if (!ok) return;
    await deletePedidosByPedidoId(grupo.key);
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
        />
      </div>

      <button
        className="fab fab-receta"
        onClick={onOpenNuevoPedido}
        title="Nuevo pedido"
      >
        <span>+</span>
        <span>Nuevo pedido</span>
      </button>
    </div>
  );
}

