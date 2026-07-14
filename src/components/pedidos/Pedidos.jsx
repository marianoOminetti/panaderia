import { useState, useRef } from "react";
import { hoyLocalISO } from "../../lib/dates";
import { reportError } from "../../utils/errorReport";
import { useClientes } from "../../hooks/useClientes";
import { useVentas, releaseVentaTransaccionClaim } from "../../hooks/useVentas";
import { enqueueVentaWrite } from "../../lib/ventaWriteQueue";
import { supabase } from "../../lib/supabaseClient";
import {
  buildVentaRowsFromPedido,
  buildStockDeltasFromPedidoItems,
  resolveVentasParaDesentregar,
  withPendingVentaIds,
} from "../../lib/pedidoEntrega";
import { facturaListaParaPdf } from "../../lib/facturaFiscal";
import { usePedidosEdit } from "../../hooks/usePedidosEdit";
import PedidosList from "./PedidosList";
import PedidosListFilters from "./PedidosListFilters";
import PedidoEditScreen from "./PedidoEditScreen";

export default function Pedidos({
  recetas,
  pedidos,
  clientes,
  stock,
  ventas,
  promociones = [],
  actualizarStockBatch,
  onRefresh,
  appendVentas,
  patchStock,
  removeVentas,
  resolveOptimisticVentas,
  appendPedidos,
  updatePedidosEstado,
  removePedidosByPedidoIdInState,
  replacePedidosInState,
  patchPedidosByPedidoId,
  showToast,
  confirm,
  onOpenNuevoPedido,
}) {
  const [search, setSearch] = useState("");
  const entregaInFlightRef = useRef(new Set());
  const desentregaInFlightRef = useRef(new Set());

  const {
    updatePedidoEntregado,
    desentregarPedido,
    deletePedidosByPedidoId,
    replacePedidosByPedidoId,
    insertCliente,
  } = useClientes({
    onRefresh,
    showToast,
    updatePedidosEstado,
    removePedidosByPedidoIdInState,
    appendPedidos,
    replacePedidosInState,
    patchPedidosByPedidoId,
  });

  const { insertVentas, deleteVentas } = useVentas();

  const edit = usePedidosEdit({
    recetas,
    promociones,
    replacePedidosByPedidoId,
    showToast,
  });

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
    const transaccionId = grupo.key;
    const rows = buildVentaRowsFromPedido(grupo, { fecha: hoy, transaccionId });
    const pendingRows = withPendingVentaIds(rows, transaccionId);
    const pendingIds = pendingRows.map((r) => r.id);
    const stockDeltas = buildStockDeltasFromPedidoItems(grupo.rawItems, -1);
    const estadoAnterior = grupo.estado || "pendiente";

    appendVentas?.(pendingRows);
    patchStock?.(stockDeltas);
    updatePedidosEstado?.(grupo.key, "entregado");
    patchPedidosByPedidoId?.(grupo.key, {
      estado: "entregado",
      venta_transaccion_id: transaccionId,
    });
    showToast?.("Registrando entrega…");

    try {
      await enqueueVentaWrite(async () => {
        let inserted = [];
        let insertedIds = [];
        try {
          inserted = await insertVentas(rows, { source: "pedido_entrega" });
          insertedIds = (inserted || []).map((r) => r.id).filter(Boolean);
          await updatePedidoEntregado(grupo.key, {
            venta_transaccion_id: transaccionId,
          });
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
      patchPedidosByPedidoId?.(grupo.key, {
        estado: estadoAnterior,
        venta_transaccion_id: null,
      });
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

  const handleDesentregar = async (grupo) => {
    if (!grupo?.key) return;
    if (desentregaInFlightRef.current.has(grupo.key)) {
      showToast?.("Revirtiendo entrega anterior…");
      return;
    }

    const fetchByTransaccionId = async (tx) => {
      const { data, error } = await supabase
        .from("ventas")
        .select("id, receta_id, cantidad, transaccion_id")
        .eq("transaccion_id", tx);
      if (error) throw error;
      return data || [];
    };

    let resolved;
    try {
      resolved = await resolveVentasParaDesentregar({
        grupo,
        ventasLocales: ventas,
        fetchByTransaccionId,
      });
    } catch (err) {
      reportError(err, { action: "resolveVentasParaDesentregar", pedido_id: grupo.key });
      showToast?.("⚠️ No se pudo buscar la venta del pedido");
      return;
    }

    if (!resolved.ventas.length) {
      showToast?.(
        "No se encontró la venta de esta entrega; no se puede desentregar automáticamente. (Entregas anteriores a este cambio pueden requerir borrar la venta a mano.)",
      );
      return;
    }

    const transaccionId = resolved.transaccionId;
    if (transaccionId) {
      const { data: factura } = await supabase
        .from("facturas_electronicas")
        .select("estado, cae")
        .eq("transaccion_id", transaccionId)
        .maybeSingle();
      if (facturaListaParaPdf(factura)) {
        showToast?.(
          "Este pedido tiene factura AFIP. Emití una nota de crédito antes de desentregar.",
        );
        return;
      }
    }

    const ok = await confirm?.(
      "¿Desentregar este pedido?\nSe borrará la venta asociada y se devolverá el stock. El pedido quedará pendiente.",
    );
    if (!ok) return;

    desentregaInFlightRef.current.add(grupo.key);
    const ventasAsociadas = resolved.ventas;
    const ventaIds = ventasAsociadas.map((v) => v.id).filter(Boolean);
    const stockDeltas = buildStockDeltasFromPedidoItems(ventasAsociadas, 1);

    removeVentas?.(ventaIds);
    patchStock?.(stockDeltas);
    updatePedidosEstado?.(grupo.key, "pendiente");
    patchPedidosByPedidoId?.(grupo.key, {
      estado: "pendiente",
      venta_transaccion_id: null,
    });
    showToast?.("Desentregando…");

    try {
      await enqueueVentaWrite(async () => {
        if (ventaIds.length) {
          await deleteVentas(ventaIds);
        }
        if (transaccionId) {
          await releaseVentaTransaccionClaim(transaccionId);
        }
        await desentregarPedido(grupo.key);
        if (actualizarStockBatch && stockDeltas.length) {
          await actualizarStockBatch(stockDeltas, { useLocalBase: true });
        }
      });
      showToast?.("✅ Pedido desentregado");
    } catch (err) {
      await onRefresh?.();
      reportError(err, {
        action: "desentregarPedido",
        pedido_id: grupo?.key,
      });
      showToast?.("⚠️ No se pudo desentregar el pedido");
    } finally {
      desentregaInFlightRef.current.delete(grupo.key);
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
            Editá pedidos pendientes, aplicá promociones, marcá entregas o
            desentregá si hace falta. Cancelá los que no se van a hacer.
          </p>
        </div>

        <PedidosListFilters search={search} onSearchChange={setSearch} />

        <PedidosList
          pedidos={pedidos}
          recetas={recetas}
          clientes={clientes}
          search={search}
          onChangeEstado={() => {}}
          onMarcarEntregado={handleMarcarEntregado}
          onDesentregar={handleDesentregar}
          onEditar={edit.abrirEditar}
          onCancelar={handleCancelar}
          onOpenNuevoPedido={onOpenNuevoPedido}
        />
      </div>

      {edit.editGrupo && (
        <PedidoEditScreen
          open
          onClose={edit.closeEdit}
          editCartItems={edit.editCartItems}
          editCartTotal={edit.editCartTotal}
          editUpdateQuantity={edit.editUpdateQuantity}
          editRemoveItem={edit.editRemoveItem}
          editSetQuantity={edit.editSetQuantity}
          editUpdatePrice={edit.editUpdatePrice}
          editForm={edit.editForm}
          setEditForm={edit.setEditForm}
          clientes={clientes}
          insertCliente={insertCliente}
          showToast={showToast}
          onGuardar={edit.guardarEdicion}
          editSaving={edit.editSaving}
          editTotalOverride={edit.editTotalOverride}
          setEditTotalOverride={edit.setEditTotalOverride}
          editCartPromos={edit.editCartPromos}
          editPromosExcluidas={edit.editPromosExcluidas}
          setEditPromosExcluidas={edit.setEditPromosExcluidas}
          recetas={recetas}
          stock={stock}
          ventas={ventas}
          promociones={promociones}
          addToCart={edit.addToCartForEdit}
        />
      )}
    </div>
  );
}
