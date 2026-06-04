/**
 * Pantalla Ventas: orquesta nueva venta (carrito useVentasCart), cobro (useVentasChargeModal), lista (VentasList),
 * edición de ventas (useVentasEdit) y venta manual (VentasManualScreen).
 */
import { useState, useEffect, useMemo } from "react";
import { fmt, toCantidadNumber } from "../../lib/format";
import { generateTransaccionId } from "../../lib/ventas";
import { useVentas } from "../../hooks/useVentas";
import { useClientes } from "../../hooks/useClientes";
import { useVentasCart } from "../../hooks/useVentasCart";
import { useCartConPromos } from "../../hooks/useCartConPromos";
import { useVentasChargeModal } from "../../hooks/useVentasChargeModal";
import { buildVentaRowsConPromos } from "../../lib/buildVentaRowsConPromos";
import { useVentasEdit } from "../../hooks/useVentasEdit";
import { hoyLocalISO } from "../../lib/dates";
import { saveVentaPendiente } from "../../lib/offlineVentas";
import { reportError } from "../../utils/errorReport";
import { agruparVentas, gruposConDeuda as getGruposConDeuda, totalDebeEnGrupo } from "../../lib/agrupadores";
import { filtrarVentasPorFechaRango } from "../../lib/ventasFiltroFecha";
import { notifyEvent } from "../../lib/notifyEvent";
import { isVentaRole as checkVentaRole } from "../../config/permissions";
import { registrarEnAfip as invokeRegistrarEnAfip } from "../../lib/registrarEnAfip";
import { useFacturasElectronicas } from "../../hooks/useFacturasElectronicas";
import VentasList from "./VentasList";
import VentasChargeModal from "./VentasChargeModal";
import VentasManualScreen from "./VentasManualScreen";

function Ventas({
  role = "admin",
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
  ventasFiltroFecha,
  onClearVentasFiltroFecha,
  promociones = [],
}) {
  const { insertVentas, deleteVentas, updateVenta } = useVentas();
  const { insertCliente, insertPedidos } = useClientes({ onRefresh, showToast });
  const { facturasByTransaccion, refreshFacturas } = useFacturasElectronicas();

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

  const [promosExcluidasCobro, setPromosExcluidasCobro] = useState([]);
  const cartPromos = useCartConPromos(cartItems, promociones, promosExcluidasCobro);

  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const [clienteSel, setClienteSel] = useState(null);
  const [medioPago, setMedioPago] = useState("efectivo");
  const [estadoPago, setEstadoPago] = useState("pagado");
  const [saving, setSaving] = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [senia, setSenia] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");
  const [notas, setNotas] = useState("");
  const [registrarEnAfip, setRegistrarEnAfip] = useState(false);
  const [isPedidoFlow, setIsPedidoFlow] = useState(false);
  const {
    chargeModalOpen,
    chargeTotalOverride,
    setChargeTotalOverride,
    openChargeModal,
    closeChargeModal,
  } = useVentasChargeModal();
  const [deletingId, setDeletingId] = useState(null);
  const hoy = hoyLocalISO();
  const isVentaRole = checkVentaRole(role);

  const edit = useVentasEdit({
    recetas,
    promociones,
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

  const ventasListado = useMemo(() => {
    if (
      !ventasFiltroFecha?.desde ||
      !ventasFiltroFecha?.hasta
    ) {
      return ventas || [];
    }
    return filtrarVentasPorFechaRango(
      ventas,
      ventasFiltroFecha.desde,
      ventasFiltroFecha.hasta
    );
  }, [ventas, ventasFiltroFecha]);

  const ingresoPeriodoFiltrado = useMemo(
    () =>
      ventasListado.reduce(
        (s, v) =>
          s +
          (v.total_final != null
            ? v.total_final
            : (v.precio_unitario || 0) * (v.cantidad || 0)),
        0
      ),
    [ventasListado]
  );

  const ventasHoy = (ventas || []).filter((v) => v.fecha === hoy);
  const ingresoHoy = ventasHoy.reduce(
    (s, v) =>
      s +
      (v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0)),
    0,
  );

  const gruposConDeuda = isVentaRole ? [] : getGruposConDeuda(ventas);
  const totalDeuda = isVentaRole
    ? 0
    : gruposConDeuda.reduce((s, g) => s + totalDebeEnGrupo(g), 0);

  const registrarVentaEnSupabase = async (rows, transaccionId) => {
    const inserted = await insertVentas(rows);
    if (actualizarStock) {
      try {
        for (const v of rows) {
          const cant = v.cantidad || 0;
          if (v.receta_id && cant > 0) {
            await actualizarStock(v.receta_id, -cant);
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

    // Notificación push (venta): fire-and-forget, solo si estamos online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      const ventaIds = (inserted || []).map((r) => r.id).filter(Boolean);
      await notifyEvent("venta", {
        venta_ids: ventaIds,
        ...(ventaIds.length === 0 && transaccionId
          ? { transaccion_id: transaccionId }
          : {}),
      });
    }

    return { inserted };
  };

  const cerrarCobro = () => {
    setPromosExcluidasCobro([]);
    closeChargeModal();
  };

  const registrarAfipDesdeVenta = async (transaccionId) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      showToast("Necesitás conexión para registrar en AFIP");
      return;
    }
    const afip = await invokeRegistrarEnAfip(transaccionId);
    await refreshFacturas();
    if (afip.ok) {
      showToast(
        afip.mock ? "✅ Registrado en AFIP (prueba)" : "✅ Registrado en AFIP",
      );
    } else {
      showToast(`⚠️ AFIP: ${(afip.error || "error").slice(0, 80)}`);
    }
  };

  const resetNuevaVenta = () => {
    setManualScreenOpen(false);
    setCartItems([]);
    setPromosExcluidasCobro([]);
    setClienteSel(null);
    setMedioPago("efectivo");
    setEstadoPago("pagado");
    setFechaEntrega("");
    setSenia("");
    setHoraEntrega("");
    setNotas("");
    setRegistrarEnAfip(false);
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

      if (typeof navigator !== "undefined" && navigator.onLine) {
        await notifyEvent("venta_eliminada", {
          venta_ids: ids,
          transaccion_id:
            rawItems[0]?.transaccion_id || grupo?.key || null,
          snapshot: {
            total: grupo?.total ?? 0,
            cliente_id: grupo?.cliente_id ?? null,
            tiene_deuda: rawItems.some((v) => v.estado_pago === "debe"),
          },
        });
      }
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

  const registrarVentaCarrito = async ({ cobroPorDefecto = false } = {}) => {
    if (saving) return;

    if (cartItems.length === 0) {
      showToast("Agregá productos al carrito primero.");
      return;
    }

    if (cobroPorDefecto && isPedidoFlow) {
      showToast("Para pedidos usá Ir a cobro.");
      return;
    }

    const hoyVenta = hoyLocalISO();
    const fechaEntregaEff = cobroPorDefecto ? "" : fechaEntrega;
    const clienteEff = cobroPorDefecto ? null : clienteSel;
    const medioPagoEff = cobroPorDefecto ? "efectivo" : medioPago;
    const estadoPagoEff = cobroPorDefecto ? "pagado" : estadoPago;
    const chargeOverrideEff = cobroPorDefecto ? "" : chargeTotalOverride;
    const promosExclEff = cobroPorDefecto ? [] : promosExcluidasCobro;
    const seniaEff = cobroPorDefecto ? "" : senia;
    const horaEntregaEff = cobroPorDefecto ? "" : horaEntrega;
    const notasEff = cobroPorDefecto ? "" : notas;

    const fechaFinal = fechaEntregaEff || hoyVenta;
    const esPedido = fechaFinal > hoyVenta;
    if (isVentaRole && esPedido) {
      showToast("Con este usuario no está habilitado guardar pedidos futuros.");
      return;
    }

    if (esPedido && !clienteEff) {
      showToast("Para pedidos es obligatorio elegir un cliente");
      return;
    }

    setSaving(true);

    try {
      const subtotalLista = cobroPorDefecto
        ? cartItems.reduce(
            (s, item) =>
              s + (item.precio_unitario || 0) * (toCantidadNumber(item.cantidad) || 0),
            0,
          )
        : cartPromos.subtotalLista;

      if (esPedido) {
        const pedidoId = generateTransaccionId();
        const seniaNum = parseFloat(String(seniaEff || "").replace(",", ".")) || 0;
        const rows = cartItems.map(({ receta, cantidad, precio_unitario }, index) => {
          const cantNum = toCantidadNumber(cantidad) || 0;
          const precio = precio_unitario || 0;
          return {
            pedido_id: pedidoId,
            cliente_id: clienteEff,
            receta_id: receta.id,
            cantidad: cantNum,
            precio_unitario: precio,
            senia: index === 0 ? seniaNum : 0,
            hora_entrega: index === 0 ? (horaEntregaEff || null) : null,
            notas: index === 0 ? (notasEff || null) : null,
            estado: "pendiente",
            fecha_entrega: fechaFinal,
          };
        });
        await insertPedidos(rows, { skipToast: true });
        const fechaDisplay = new Date(fechaFinal).toLocaleDateString("es-AR");
        showToast(`✅ Pedido guardado para ${fechaDisplay}: ${fmt(subtotalLista)}`);
      } else {
        const transaccionId = generateTransaccionId();
        const built = buildVentaRowsConPromos({
          cartItems,
          promociones,
          excludePromoIds: promosExclEff,
          chargeTotalOverride: chargeOverrideEff,
          fecha: fechaFinal,
          transaccionId,
          clienteId: clienteEff,
          medioPago: medioPagoEff,
          estadoPago: estadoPagoEff,
        });
        const { rows, promoResult, subtotalLista: subLista, totalCobrado } = built;
        if (
          subLista === 0 &&
          chargeOverrideEff !== "" &&
          !Number.isNaN(parseFloat(String(chargeOverrideEff).replace(",", "."))) &&
          parseFloat(String(chargeOverrideEff).replace(",", ".")) > 0
        ) {
          showToast("Para usar un total final distinto, asigná precios mayores a 0 en el carrito.");
          setSaving(false);
          return;
        }
        const promoLabel = promoResult.aplicadas.map((a) => a.nombre).join(", ");
        if (registrarEnAfip && typeof navigator !== "undefined" && !navigator.onLine) {
          showToast("Para registrar en AFIP necesitás conexión. Desmarcá la opción o volvé a intentar online.");
          setSaving(false);
          return;
        }
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          await saveVentaPendiente(rows);
          showToast(
            `✅ Venta guardada offline: ${fmt(totalCobrado)}${promoLabel ? ` (${promoLabel})` : ""}. Se sincronizará cuando vuelva la conexión.`,
          );
        } else {
          await registrarVentaEnSupabase(rows, transaccionId);
          let toastMsg = `✅ Venta registrada: ${fmt(totalCobrado)}${promoLabel ? ` · ${promoLabel}` : ""}`;
          if (registrarEnAfip) {
            try {
              const afip = await invokeRegistrarEnAfip(transaccionId);
              await refreshFacturas();
              if (afip.ok) {
                toastMsg += afip.mock
                  ? " · AFIP (prueba)"
                  : " · Registrado en AFIP";
              } else {
                const detalle = afip.error
                  ? String(afip.error).slice(0, 120)
                  : "no se pudo registrar";
                toastMsg += ` · AFIP: ${detalle}`;
              }
            } catch (afipErr) {
              reportError(afipErr, { action: "registrarEnAfip", transaccionId });
              toastMsg += " · AFIP: error de conexión (la venta sí quedó guardada)";
            }
          }
          showToast(toastMsg);
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
      {isVentaRole ? (
        <p className="page-subtitle">Últimas ventas registradas</p>
      ) : ventasFiltroFecha?.desde && ventasFiltroFecha?.hasta ? (
        <>
          <p className="page-subtitle">
            {ventasFiltroFecha.label?.trim() || "Período filtrado"}
          </p>
          <p className="page-subtitle">Total en período: {fmt(ingresoPeriodoFiltrado)}</p>
        </>
      ) : (
        <p className="page-subtitle">Hoy: {fmt(ingresoHoy)}</p>
      )}

      {!isVentaRole && ventasFiltroFecha?.desde && ventasFiltroFecha?.hasta && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>
              Fechas: <strong>{ventasFiltroFecha.desde}</strong> —{" "}
              <strong>{ventasFiltroFecha.hasta}</strong>
            </span>
            <button
              type="button"
              className="card-link"
              onClick={() => onClearVentasFiltroFecha?.()}
            >
              Quitar filtro
            </button>
          </div>
        </div>
      )}

      <VentasList
        ventas={ventasListado}
        hoy={hoy}
        recetas={recetas}
        promociones={promociones}
        clientes={clientes}
        gruposConDeuda={gruposConDeuda}
        totalDeuda={totalDeuda}
        eliminarVenta={eliminarVenta}
        abrirEditar={abrirEditar}
        deletingId={deletingId}
        isVentaRole={isVentaRole}
        facturasByTransaccion={facturasByTransaccion}
        onRegistrarAfip={registrarAfipDesdeVenta}
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
        ventas={ventas}
        stock={stock}
        addToCart={edit.editGrupo ? edit.addToCartForEdit : addToCart}
        onCobrar={() => {
          if (cartItems.length === 0) return;
          setPromosExcluidasCobro([]);
          openChargeModal();
        }}
        onRegistrarRapida={() => registrarVentaCarrito({ cobroPorDefecto: true })}
        savingVenta={saving}
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
      />

      <VentasChargeModal
        open={chargeModalOpen}
        onClose={cerrarCobro}
        cartItems={cartItems}
        cartTotal={cartTotal}
        cartPromos={cartPromos}
        promosExcluidasCobro={promosExcluidasCobro}
        setPromosExcluidasCobro={setPromosExcluidasCobro}
        clienteSel={clienteSel}
        setClienteSel={setClienteSel}
        medioPago={medioPago}
        setMedioPago={setMedioPago}
        estadoPago={estadoPago}
        setEstadoPago={setEstadoPago}
        chargeTotalOverride={chargeTotalOverride}
        setChargeTotalOverride={setChargeTotalOverride}
        onRegistrar={() => registrarVentaCarrito()}
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
        allowPedidos={!isVentaRole}
        showAfip={!isVentaRole}
        registrarEnAfip={registrarEnAfip}
        setRegistrarEnAfip={setRegistrarEnAfip}
      />
    </div>
  );
}

export default Ventas;
