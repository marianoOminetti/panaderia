/**
 * Pantalla Ventas: orquesta nueva venta (carrito useVentasCart), cobro (useVentasChargeModal), lista (VentasList),
 * edición de ventas (useVentasEdit) y venta manual (VentasManualScreen).
 */
import { useState, useEffect } from "react";
import { fmt, toCantidadNumber } from "../../lib/format";
import { generateTransaccionId } from "../../lib/ventas";
import { useVentas } from "../../hooks/useVentas";
import { useClientes } from "../../hooks/useClientes";
import { useVentasCart } from "../../hooks/useVentasCart";
import { useVentasChargeModal } from "../../hooks/useVentasChargeModal";
import { useVentasEdit } from "../../hooks/useVentasEdit";
import { hoyLocalISO } from "../../lib/dates";
import { saveVentaPendiente } from "../../lib/offlineVentas";
import { reportError } from "../../utils/errorReport";
import { agruparVentas, gruposConDeuda as getGruposConDeuda, totalDebeEnGrupo } from "../../lib/agrupadores";
import { notifyEvent } from "../../lib/notifyEvent";
import VentasList from "./VentasList";
import VentasChargeModal from "./VentasChargeModal";
import VentasManualScreen from "./VentasManualScreen";

function Ventas({
  recetas,
  ventas,
  clientes,
  stock,
  actualizarStock,
  actualizarStockBatch,
  onRefresh,
  showToast,
  confirm,
  ventasPreloadGrupoKey,
  onConsumedVentasPreload,
  ventasNuevaFlag,
  onConsumedVentasNueva,
  ventasPedidoFlag,
  onConsumedVentasPedido,
  onOpenCargarProduccion,
}) {
  const { insertVentas, deleteVentas, updateVenta } = useVentas();
  const { insertCliente, insertPedidos } = useClientes({ onRefresh, showToast });

  const {
    cartItems,
    setCartItems,
    addToCart,
    updateCartQuantity,
    setCartQuantity,
    removeFromCart,
    updateCartPrice,
    cartTotal,
  } = useVentasCart();

  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const [clienteSel, setClienteSel] = useState(null);
  const [medioPago, setMedioPago] = useState("efectivo");
  const [estadoPago, setEstadoPago] = useState("pagado");
  const [saving, setSaving] = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [senia, setSenia] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");
  const [notas, setNotas] = useState("");
  const [isPedidoFlow, setIsPedidoFlow] = useState(false);
  const {
    chargeModalOpen,
    chargeTotalOverride,
    setChargeTotalOverride,
    openChargeModal,
    closeChargeModal,
  } = useVentasChargeModal();
  const [deletingId, setDeletingId] = useState(null);
  const [productosEnCeroAviso, setProductosEnCeroAviso] = useState(null);
  const hoy = hoyLocalISO();

  const edit = useVentasEdit({
    recetas,
    updateVenta,
    deleteVentas,
    insertVentas,
    actualizarStock,
    actualizarStockBatch,
    showToast,
    onRefresh,
    hoy,
    onCloseEdit: () => setManualScreenOpen(false),
  });

  const ventasHoy = (ventas || []).filter((v) => v.fecha === hoy);
  const ingresoHoy = ventasHoy.reduce(
    (s, v) =>
      s +
      (v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0)),
    0,
  );

  const gruposConDeuda = getGruposConDeuda(ventas);
  const totalDeuda = gruposConDeuda.reduce((s, g) => s + totalDebeEnGrupo(g), 0);

  const registrarVentaEnSupabase = async (rows, transaccionId) => {
    const inserted = await insertVentas(rows);
    const zeros = [];
    if (actualizarStock) {
      try {
        for (const v of rows) {
          const cant = v.cantidad || 0;
          if (v.receta_id && cant > 0) {
            const res = await actualizarStock(v.receta_id, -cant);
            if (res?.anterior > 0 && res?.nuevo === 0) {
              const receta = (recetas || []).find((r) => r.id === v.receta_id);
              if (receta) zeros.push(receta);
            }
          }
        }
      } catch (err) {
        const ids = (inserted || []).map((r) => r.id).filter(Boolean);
        if (ids.length > 0) {
          try {
            await deleteVentas(ids);
          } catch (rollbackErr) {
            reportError(rollbackErr, { action: "rollbackVentasAfterStockFail", ids });
          }
        }
        throw err;
      }
    }
    return { inserted, zeros };

    // Notificación push (venta): fire-and-forget, solo si estamos online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      const ventaIds = (inserted || []).map((r) => r.id).filter(Boolean);
      notifyEvent("venta", {
        transaccion_id: transaccionId || null,
        venta_ids: ventaIds,
      });
    }
  };

  const resetNuevaVenta = () => {
    setManualScreenOpen(false);
    setCartItems([]);
    setClienteSel(null);
    setMedioPago("efectivo");
    setEstadoPago("pagado");
    setFechaEntrega("");
    setSenia("");
    setHoraEntrega("");
    setNotas("");
    closeChargeModal();
    setIsPedidoFlow(false);
  };

  const eliminarVenta = async (grupo) => {
    if (!(await confirm("¿Eliminar esta venta?", { destructive: true }))) return;

    const rawItems = grupo?.rawItems || [];
    const ids = rawItems.map((i) => i.id).filter(Boolean);
    if (ids.length === 0) {
      showToast("⚠️ No hay ventas para eliminar");
      return;
    }

    // Deltas de stock: mismo criterio que guardarEdicion, pero para eliminar devolvemos lo vendido (delta positivo)
    const deltasMap = {};
    for (const v of rawItems) {
      if (!v?.receta_id) continue;
      const cant = toCantidadNumber(v.cantidad);
      if (cant <= 0) continue;
      deltasMap[v.receta_id] = (deltasMap[v.receta_id] || 0) + cant;
    }
    const stockDeltas = Object.entries(deltasMap)
      .filter(([, d]) => d !== 0)
      .map(([receta_id, delta]) => ({ receta_id, delta }));

    setDeletingId(grupo.key || ids[0]);
    let stockAplicado = false;

    try {
      if (stockDeltas.length > 0) {
        if (actualizarStockBatch) {
          await actualizarStockBatch(stockDeltas);
        } else if (actualizarStock) {
          for (const { receta_id, delta } of stockDeltas) {
            await actualizarStock(receta_id, delta);
          }
        }
        stockAplicado = true;
      }

      await deleteVentas(ids);
      showToast("✅ Venta eliminada");
      onRefresh();
    } catch (err) {
      if (stockAplicado && stockDeltas.length > 0) {
        const undo = stockDeltas.map(({ receta_id, delta }) => ({
          receta_id,
          delta: -delta,
        }));
        try {
          if (actualizarStockBatch) {
            await actualizarStockBatch(undo);
          } else if (actualizarStock) {
            for (const { receta_id, delta } of undo) {
              await actualizarStock(receta_id, delta);
            }
          }
        } catch (rollbackErr) {
          reportError(rollbackErr, {
            action: "rollbackStockAfterDeleteVentaFail",
            ids,
          });
        }
      }
      reportError(err, { action: "eliminarVenta", ids });
      const msg = (err?.message || err?.code || "Error").slice(0, 80);
      showToast(`⚠️ No se puede eliminar: ${msg}`);
    } finally {
      setDeletingId(null);
    }
  };

  const abrirEditar = (grupo) => {
    edit.abrirEditar(grupo);
    setManualScreenOpen(true);
  };

  useEffect(() => {
    if (!ventasPreloadGrupoKey) return;
    const grupos = agruparVentas(ventas || []);
    const grupo = grupos.find((g) => g.key === ventasPreloadGrupoKey);
    if (grupo) abrirEditar(grupo);
    onConsumedVentasPreload?.();
  }, [ventasPreloadGrupoKey, ventas]); // eslint-disable-line react-hooks/exhaustive-deps -- callback estable desde App

  useEffect(() => {
    if (!ventasNuevaFlag) return;
    setManualScreenOpen(true);
    closeChargeModal();
    setIsPedidoFlow(false);
    onConsumedVentasNueva?.();
  }, [ventasNuevaFlag]); // eslint-disable-line react-hooks/exhaustive-deps -- callback estable desde App

  useEffect(() => {
    if (!ventasPedidoFlag) return;
    const maniana = new Date();
    maniana.setDate(maniana.getDate() + 1);
    const manianaISO = maniana.toISOString().split("T")[0];
    setFechaEntrega(manianaISO);
    setManualScreenOpen(true);
    closeChargeModal();
    setIsPedidoFlow(true);
    onConsumedVentasPedido?.();
  }, [ventasPedidoFlag, closeChargeModal, onConsumedVentasPedido]);

  const closeManualScreen = () => {
    if (edit.editGrupo) {
      setManualScreenOpen(false);
      edit.closeEdit();
    } else {
      resetNuevaVenta();
    }
  };

  const registrarVentaCarrito = async () => {
    if (cartItems.length === 0) {
      showToast("Agregá productos al carrito primero.");
      return;
    }

    const hoyVenta = hoyLocalISO();
    const fechaFinal = fechaEntrega || hoyVenta;
    const esPedido = fechaFinal > hoyVenta;

    if (esPedido && !clienteSel) {
      showToast("Para pedidos es obligatorio elegir un cliente");
      return;
    }

    if (!esPedido) {
      const sinStock = cartItems.filter(
        ({ receta, cantidad }) =>
          ((stock || {})[receta.id] ?? 0) < (toCantidadNumber(cantidad) || 0),
      );
      if (sinStock.length > 0 && !(await confirm(`Stock insuficiente en ${sinStock.map((s) => s.receta.nombre).join(", ")}. ¿Registrar venta igual?`)))
        return;
    }

    setSaving(true);
    try {
      const totalCarrito = cartItems.reduce((s, it) => {
        const cant = toCantidadNumber(it.cantidad) || 0;
        return s + (it.precio_unitario || 0) * cant;
      }, 0);

      if (esPedido) {
        const pedidoId = generateTransaccionId();
        const seniaNum = parseFloat(String(senia || "").replace(",", ".")) || 0;
        const rows = cartItems.map(({ receta, cantidad, precio_unitario }, index) => {
          const cantNum = toCantidadNumber(cantidad) || 0;
          const precio = precio_unitario || 0;
          return {
            pedido_id: pedidoId,
            cliente_id: clienteSel,
            receta_id: receta.id,
            cantidad: cantNum,
            precio_unitario: precio,
            senia: index === 0 ? seniaNum : 0,
            hora_entrega: index === 0 ? (horaEntrega || null) : null,
            notas: index === 0 ? (notas || null) : null,
            estado: "pendiente",
            fecha_entrega: fechaFinal,
          };
        });
        await insertPedidos(rows, { skipToast: true });
        const fechaDisplay = new Date(fechaFinal).toLocaleDateString("es-AR");
        showToast(`✅ Pedido guardado para ${fechaDisplay}: ${fmt(totalCarrito)}`);
      } else {
        const override = parseFloat(String(chargeTotalOverride || "").replace(",", "."));
        const usarOverride = !Number.isNaN(override) && override >= 0 && override !== totalCarrito && totalCarrito > 0;
        if (totalCarrito === 0 && !Number.isNaN(override) && override > 0) {
          showToast("Para usar un total final distinto, asigná precios mayores a 0 en el carrito.");
          setSaving(false);
          return;
        }
        let transaccionId = generateTransaccionId();
        const rows = cartItems.map(({ receta, cantidad, precio_unitario }) => {
          const cantNum = toCantidadNumber(cantidad) || 0;
          const precio = precio_unitario || 0;
          const subtotal = precio * cantNum;
          return {
            receta_id: receta.id,
            cantidad: cantNum,
            precio_unitario: precio,
            subtotal,
            descuento: 0,
            total_final: subtotal,
            fecha: fechaFinal,
            transaccion_id: transaccionId,
            cliente_id: clienteSel || null,
            medio_pago: medioPago,
            estado_pago: estadoPago,
          };
        });
        if (usarOverride) {
          const factor = override / totalCarrito;
          let acumulado = 0;
          for (let i = 0; i < rows.length; i++) {
            const nuevoSubtotal = i === rows.length - 1 ? override - acumulado : Math.round(rows[i].subtotal * factor);
            rows[i].precio_unitario = rows[i].cantidad > 0 ? nuevoSubtotal / rows[i].cantidad : rows[i].precio_unitario;
            rows[i].subtotal = nuevoSubtotal;
            rows[i].total_final = nuevoSubtotal;
            acumulado += nuevoSubtotal;
          }
        }
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          await saveVentaPendiente(rows);
          showToast(`✅ Venta guardada offline: ${fmt(usarOverride ? override : totalCarrito)}. Se sincronizará cuando vuelva la conexión.`);
        } else {
          const { zeros } = await registrarVentaEnSupabase(rows, transaccionId);
          showToast(`✅ Venta registrada: ${fmt(usarOverride ? override : totalCarrito)}`);
          if (zeros && zeros.length > 0) {
            setProductosEnCeroAviso(zeros);
          }
        }
      }
      resetNuevaVenta();
      onRefresh();
    } catch (err) {
      reportError(err, { action: esPedido ? "registrarPedido" : "registrarVentaCarrito" });
      showToast(esPedido ? "⚠️ Error al guardar pedido" : "⚠️ Error al registrar venta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content">
      <p className="page-title">Ventas</p>
      <p className="page-subtitle">Hoy: {fmt(ingresoHoy)}</p>

      <VentasList
        ventas={ventas}
        hoy={hoy}
        recetas={recetas}
        clientes={clientes}
        gruposConDeuda={gruposConDeuda}
        totalDeuda={totalDeuda}
        eliminarVenta={eliminarVenta}
        abrirEditar={abrirEditar}
        deletingId={deletingId}
      />

      {!manualScreenOpen && (
        <button
          className="fab fab-receta"
          onClick={() => setManualScreenOpen(true)}
          title="Nueva venta"
        >
          <span>+</span>
          <span>Nueva venta</span>
        </button>
      )}

      <VentasManualScreen
        open={manualScreenOpen}
        onClose={closeManualScreen}
        mode={edit.editGrupo ? "edit" : "new"}
        isPedidoFlow={isPedidoFlow}
        cartItems={cartItems}
        cartTotal={cartTotal}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        updateCartPrice={updateCartPrice}
        setCartQuantity={setCartQuantity}
        recetas={recetas}
        stock={stock}
        addToCart={edit.editGrupo ? edit.addToCartForEdit : addToCart}
        onCobrar={() => {
          if (cartItems.length === 0) return;
          openChargeModal();
        }}
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
      />

      <VentasChargeModal
        open={chargeModalOpen}
        onClose={closeChargeModal}
        cartItems={cartItems}
        cartTotal={cartTotal}
        clienteSel={clienteSel}
        setClienteSel={setClienteSel}
        medioPago={medioPago}
        setMedioPago={setMedioPago}
        estadoPago={estadoPago}
        setEstadoPago={setEstadoPago}
        chargeTotalOverride={chargeTotalOverride}
        setChargeTotalOverride={setChargeTotalOverride}
        onRegistrar={registrarVentaCarrito}
        saving={saving}
        clientes={clientes}
        insertCliente={insertCliente}
        showToast={showToast}
        fechaEntrega={fechaEntrega}
        setFechaEntrega={setFechaEntrega}
        senia={senia}
        setSenia={setSenia}
        horaEntrega={horaEntrega}
        setHoraEntrega={setHoraEntrega}
        notas={notas}
        setNotas={setNotas}
      />

      {productosEnCeroAviso && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setProductosEnCeroAviso(null)}
            >
              ← Volver
            </button>
            <span className="screen-title">Productos en 0</span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-header">
                <span className="card-title">Se agotó stock</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                Esta venta dejó algunos productos en 0. Si vas a producir, podés cargar stock ahora.
              </p>
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Productos</span>
              </div>
              {productosEnCeroAviso.map((r) => (
                <div
                  key={r.id}
                  className="insumo-item"
                  style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}
                >
                  <div className="insumo-info" style={{ flex: 1 }}>
                    <div className="insumo-nombre">
                      {r.emoji || "🍞"} {r.nombre}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="btn-primary"
                onClick={() => {
                  const recs = productosEnCeroAviso;
                  setProductosEnCeroAviso(null);
                  if (recs?.length) {
                    onOpenCargarProduccion?.(recs.length === 1 ? recs[0] : recs);
                  }
                }}
              >
                Cargar stock
              </button>
              <button className="btn-secondary" onClick={() => setProductosEnCeroAviso(null)}>
                Lo veo después
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;
