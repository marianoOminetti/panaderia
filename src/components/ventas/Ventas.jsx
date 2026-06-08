/**
 * Pantalla Ventas: orquesta nueva venta (carrito useVentasCart), cobro (useVentasChargeModal), lista (VentasList),
 * edición de ventas (useVentasEdit) y venta manual (VentasManualScreen).
 */
import { useState, useEffect, useMemo, memo, useRef } from "react";
import { fmt, toCantidadNumber } from "../../lib/format";
import { generateTransaccionId, isPendingVentaId } from "../../lib/ventas";
import { useVentas } from "../../hooks/useVentas";
import { useClientes } from "../../hooks/useClientes";
import { useVentasCart } from "../../hooks/useVentasCart";
import { useCartConPromos } from "../../hooks/useCartConPromos";
import { useVentasChargeModal } from "../../hooks/useVentasChargeModal";
import { buildVentaRowsConPromos } from "../../lib/buildVentaRowsConPromos";
import { useVentasEdit } from "../../hooks/useVentasEdit";
import { hoyLocalISO } from "../../lib/dates";
import { saveVentaPendiente } from "../../lib/offlineVentas";
import {
  getVentaSession,
  persistVentaSession,
  clearVentaSession,
} from "../../lib/sessionCache";
import { perfMark } from "../../lib/perf";
import { reportError } from "../../utils/errorReport";
import { agruparVentas, gruposConDeuda as getGruposConDeuda, totalDebeEnGrupo } from "../../lib/agrupadores";
import { filtrarVentasPorFechaRango } from "../../lib/ventasFiltroFecha";
import { notifyEvent } from "../../lib/notifyEvent";
import { isVentaRole as checkVentaRole } from "../../config/permissions";
import { registrarEnAfip as invokeRegistrarEnAfip } from "../../lib/registrarEnAfip";
import {
  buildAfipReceptorPayload,
  afipReceptorFromCliente,
  buildAfipReceptorForRetry,
  documentoFromFactura,
  shouldPersistClienteFiscal,
} from "../../lib/afipReceptor";
import { getTransaccionIdFromGrupo, facturaPuedeReintentarAfip } from "../../lib/facturaFiscal";
import { useFacturasElectronicas } from "../../hooks/useFacturasElectronicas";
import VentasList from "./VentasList";
import VentasChargeModal from "./VentasChargeModal";
import VentasManualScreen from "./VentasManualScreen";

function buildStockDeltasFromRows(rows) {
  return rows
    .filter((v) => v.receta_id && (v.cantidad || 0) > 0)
    .map((v) => ({ receta_id: v.receta_id, delta: -(v.cantidad || 0) }));
}

function withPendingVentaIds(rows, transaccionId) {
  const now = new Date().toISOString();
  return rows.map((r, i) => ({
    ...r,
    id: `pending-${transaccionId}-${i}`,
    created_at: now,
  }));
}

function Ventas({
  role = "admin",
  recetas,
  ventas,
  clientes,
  stock,
  actualizarStock,
  actualizarStockBatch,
  onRefresh,
  appendVentas,
  removeVentas,
  replaceVentas,
  resolveOptimisticVentas,
  patchStock,
  appendPedidos,
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
  const { insertCliente, insertPedidos, updateClienteDatosFiscales } = useClientes({
    onRefresh,
    showToast,
    appendPedidos,
  });
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
  const registerInFlightRef = useRef(false);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [senia, setSenia] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");
  const [notas, setNotas] = useState("");
  const [registrarEnAfip, setRegistrarEnAfip] = useState(false);
  const [datosFiscalesAfip, setDatosFiscalesAfip] = useState({
    documento: "",
    razon_social: "",
  });
  const [editRegistrarEnAfip, setEditRegistrarEnAfip] = useState(false);
  const [editDatosFiscalesAfip, setEditDatosFiscalesAfip] = useState({
    documento: "",
    razon_social: "",
  });
  const [editFacturaEstado, setEditFacturaEstado] = useState(null);
  const [editPuedeRegistrarAfip, setEditPuedeRegistrarAfip] = useState(true);
  const [isPedidoFlow, setIsPedidoFlow] = useState(false);
  const {
    chargeModalOpen,
    chargeTotalOverride,
    setChargeTotalOverride,
    openChargeModal,
    closeChargeModal,
  } = useVentasChargeModal();
  const [deletingId] = useState(null);
  const deleteInFlightRef = useRef(new Set());
  const hoy = hoyLocalISO();
  const isVentaRole = checkVentaRole(role);

  useEffect(() => {
    let cancelled = false;
    getVentaSession().then((saved) => {
      if (cancelled || !saved?.cartItems?.length) return;
      const age = Date.now() - (saved.savedAt || 0);
      if (age > 24 * 60 * 60 * 1000) return;
      setCartItems(saved.cartItems);
      if (saved.manualScreenOpen) setManualScreenOpen(true);
      if (saved.chargeModalOpen) openChargeModal();
      if (saved.clienteSel != null) setClienteSel(saved.clienteSel);
      if (saved.medioPago) setMedioPago(saved.medioPago);
      if (saved.estadoPago) setEstadoPago(saved.estadoPago);
    });
    return () => {
      cancelled = true;
    };
  }, [openChargeModal, setCartItems]);

  useEffect(() => {
    const persist = () => {
      if (document.visibilityState !== "hidden") return;
      if (cartItems.length === 0 && !manualScreenOpen) {
        clearVentaSession().catch(() => {});
        return;
      }
      persistVentaSession({
        cartItems,
        manualScreenOpen,
        chargeModalOpen,
        clienteSel,
        medioPago,
        estadoPago,
      }).catch(() => {});
    };
    document.addEventListener("visibilitychange", persist);
    return () => document.removeEventListener("visibilitychange", persist);
  }, [
    cartItems,
    manualScreenOpen,
    chargeModalOpen,
    clienteSel,
    medioPago,
    estadoPago,
  ]);

  const edit = useVentasEdit({
    recetas,
    promociones,
    updateVenta,
    deleteVentas,
    insertVentas,
    actualizarStock,
    actualizarStockBatch,
    patchStock,
    showToast,
    removeVentas,
    replaceVentas,
    appendVentas,
    resolveOptimisticVentas,
    onRefresh,
    hoy,
    onCloseEdit: () => setManualScreenOpen(false),
  });

  const ventasArray = useMemo(
    () => (Array.isArray(ventas) ? ventas : []),
    [ventas],
  );

  const ventasListado = useMemo(() => {
    if (
      !ventasFiltroFecha?.desde ||
      !ventasFiltroFecha?.hasta
    ) {
      return ventasArray;
    }
    return filtrarVentasPorFechaRango(
      ventasArray,
      ventasFiltroFecha.desde,
      ventasFiltroFecha.hasta
    );
  }, [ventasArray, ventasFiltroFecha]);

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

  const ventasHoy = useMemo(
    () => ventasArray.filter((v) => v.fecha === hoy),
    [ventasArray, hoy],
  );
  const ingresoHoy = useMemo(
    () =>
      ventasHoy.reduce(
        (s, v) =>
          s +
          (v.total_final != null
            ? v.total_final
            : (v.precio_unitario || 0) * (v.cantidad || 0)),
        0,
      ),
    [ventasHoy],
  );

  const gruposConDeuda = useMemo(
    () => (isVentaRole ? [] : getGruposConDeuda(ventasArray)),
    [ventasArray, isVentaRole],
  );
  const totalDeuda = useMemo(
    () =>
      isVentaRole
        ? 0
        : gruposConDeuda.reduce((s, g) => s + totalDebeEnGrupo(g), 0),
    [gruposConDeuda, isVentaRole],
  );

  const persistVentaOnline = async (rows, transaccionId, { stockAlreadyPatched = false } = {}) => {
    const inserted = await insertVentas(rows);
    const stockDeltas = buildStockDeltasFromRows(rows);
    if (actualizarStockBatch && stockDeltas.length > 0) {
      try {
        await actualizarStockBatch(stockDeltas, { useLocalBase: stockAlreadyPatched });
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

    if (typeof navigator !== "undefined" && navigator.onLine) {
      const ventaIds = (inserted || []).map((r) => r.id).filter(Boolean);
      notifyEvent("venta", {
        venta_ids: ventaIds,
        ...(ventaIds.length === 0 && transaccionId
          ? { transaccion_id: transaccionId }
          : {}),
      }).catch(() => {});
    }

    return { inserted };
  };

  const runAfipAfterVenta = (transaccionId, afipReceptor, totalCobrado, afipActivo, clienteEff) => {
    if (!afipActivo) return;
    if (clienteEff && afipReceptor) {
      persistirDatosFiscalesCliente(clienteEff, afipReceptor).catch(() => {});
    }
    invokeRegistrarEnAfip(transaccionId, afipReceptor)
      .then(async (afip) => {
        await refreshFacturas(transaccionId);
        if (afip.ok) {
          showToast(
            afip.mock
              ? `✅ AFIP (prueba) · ${fmt(totalCobrado)}`
              : `✅ Registrado en AFIP · ${fmt(totalCobrado)}`,
          );
        } else {
          const detalle = afip.error
            ? String(afip.error).slice(0, 120)
            : "no se pudo registrar";
          showToast(`⚠️ AFIP: ${detalle} (la venta sí quedó guardada)`);
        }
      })
      .catch((afipErr) => {
        reportError(afipErr, { action: "registrarEnAfip", transaccionId });
        showToast("⚠️ AFIP: error de conexión (la venta sí quedó guardada)");
      });
  };

  const cerrarCobro = () => {
    setPromosExcluidasCobro([]);
    closeChargeModal();
  };

  const persistirDatosFiscalesCliente = async (clienteId, receptor) => {
    if (!clienteId || !shouldPersistClienteFiscal(receptor)) return;
    try {
      await updateClienteDatosFiscales(clienteId, {
        ...(receptor.cuit ? { cuit: receptor.cuit } : {}),
        ...(receptor.dni ? { dni: receptor.dni } : {}),
        razon_social: receptor.razon_social,
      });
    } catch (err) {
      reportError(err, { action: "persistirDatosFiscalesCliente", clienteId });
    }
  };

  const registrarAfipDesdeVenta = async (transaccionId) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      showToast("Necesitás conexión para registrar en AFIP");
      return;
    }
    const factura = await refreshFacturas(transaccionId);
    const facturasMap = factura
      ? { ...facturasByTransaccion, [transaccionId]: factura }
      : facturasByTransaccion;
    const receptor = buildAfipReceptorForRetry(
      transaccionId,
      facturasMap,
      ventas,
      clientes,
    );
    const afip = await invokeRegistrarEnAfip(transaccionId, receptor);
    await refreshFacturas(transaccionId);
    if (afip.ok) {
      const venta = (ventas || []).find(
        (v) => v.transaccion_id === transaccionId && v.cliente_id,
      );
      if (venta?.cliente_id) {
        await persistirDatosFiscalesCliente(venta.cliente_id, receptor);
      }
      showToast(
        afip.mock ? "✅ Registrado en AFIP (prueba)" : "✅ Registrado en AFIP",
      );
    } else {
      showToast(`⚠️ AFIP: ${(afip.error || "error").slice(0, 80)}`);
    }
  };

  const prefillDatosFiscalesAfip = (clienteId, { force = false } = {}) => {
    setDatosFiscalesAfip((prev) => {
      const tieneDatos =
        (prev.documento ?? prev.cuit ?? "").length > 0 ||
          (prev.razon_social || "").trim().length > 0;
      if (!force && tieneDatos) return prev;
      const cliente = (clientes || []).find((c) => c.id === clienteId);
      return afipReceptorFromCliente(cliente);
    });
  };

  const handleRegistrarEnAfipChange = (checked) => {
    setRegistrarEnAfip(checked);
    if (checked) {
      prefillDatosFiscalesAfip(clienteSel, { force: true });
    } else {
      setDatosFiscalesAfip({ documento: "", razon_social: "" });
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
    setDatosFiscalesAfip({ documento: "", razon_social: "" });
    closeChargeModal();
    setIsPedidoFlow(false);
    clearVentaSession().catch(() => {});
  };

  const eliminarVenta = async (grupo) => {
    if (!(await confirm("¿Eliminar esta venta?", { destructive: true }))) return;

    const rawItems = grupo?.rawItems || [];
    const pendingIds = rawItems.map((i) => i.id).filter((id) => isPendingVentaId(id));
    const ids = rawItems.map((i) => i.id).filter((id) => id && !isPendingVentaId(id));

    if (pendingIds.length > 0 && ids.length === 0) {
      removeVentas?.(pendingIds);
      showToast("Venta pendiente descartada");
      return;
    }

    if (ids.length === 0) {
      showToast("⚠️ No hay ventas para eliminar");
      return;
    }

    const deleteKey = grupo.key || ids[0];
    if (deleteInFlightRef.current.has(deleteKey)) return;
    deleteInFlightRef.current.add(deleteKey);

    const itemsForStock =
      grupo?.items?.length > 0
        ? grupo.items
        : rawItems.filter((v) => !isPendingVentaId(v.id));
    const deltasMap = {};
    for (const v of itemsForStock) {
      if (!v?.receta_id) continue;
      const cant = toCantidadNumber(v.cantidad);
      if (cant <= 0) continue;
      deltasMap[v.receta_id] = (deltasMap[v.receta_id] || 0) + cant;
    }
    const stockDeltas = Object.entries(deltasMap)
      .filter(([, d]) => d !== 0)
      .map(([receta_id, delta]) => ({ receta_id, delta }));
    const snapshot = [...rawItems];
    const allLocalIds = rawItems.map((i) => i.id).filter(Boolean);

    if (removeVentas) removeVentas(allLocalIds);
    if (patchStock && stockDeltas.length) patchStock(stockDeltas);
    showToast("Eliminando venta…");

    (async () => {
      try {
        if (stockDeltas.length > 0) {
          if (actualizarStockBatch) {
            await actualizarStockBatch(stockDeltas, { useLocalBase: true });
          } else if (actualizarStock) {
            for (const { receta_id, delta } of stockDeltas) {
              await actualizarStock(receta_id, delta);
            }
          }
        }
        await deleteVentas(ids);
        if (typeof navigator !== "undefined" && navigator.onLine) {
          notifyEvent("venta_eliminada", {
            venta_ids: ids,
            transaccion_id:
              rawItems[0]?.transaccion_id || grupo?.key || null,
            snapshot: {
              total: grupo?.total ?? 0,
              cliente_id: grupo?.cliente_id ?? null,
              tiene_deuda: rawItems.some((v) => v.estado_pago === "debe"),
            },
          }).catch(() => {});
        }
        showToast("✅ Venta eliminada");
      } catch (err) {
        if (appendVentas && snapshot.length) appendVentas(snapshot);
        if (patchStock && stockDeltas.length) {
          patchStock(
            stockDeltas.map(({ receta_id, delta }) => ({ receta_id, delta: -delta })),
          );
        }
        if (stockDeltas.length && actualizarStockBatch) {
          try {
            await actualizarStockBatch(
              stockDeltas.map(({ receta_id, delta }) => ({ receta_id, delta: -delta })),
              { useLocalBase: false },
            );
          } catch (rollbackErr) {
            reportError(rollbackErr, {
              action: "rollbackStockDbAfterDeleteVentaFail",
              ids,
            });
          }
        }
        reportError(err, { action: "eliminarVenta", ids });
        const msg = (err?.message || err?.code || "Error").slice(0, 80);
        showToast(`⚠️ No se pudo eliminar: ${msg}`);
        onRefresh?.();
      } finally {
        deleteInFlightRef.current.delete(deleteKey);
      }
    })();
  };

  const initAfipEdicion = (grupo, facturaOverride) => {
    const transaccionId = getTransaccionIdFromGrupo(grupo);
    const factura =
      facturaOverride ??
      (transaccionId ? facturasByTransaccion[transaccionId] : null);
    setEditFacturaEstado(factura?.estado ?? null);
    setEditPuedeRegistrarAfip(facturaPuedeReintentarAfip(factura));
    setEditRegistrarEnAfip(false);
    const cliente = (clientes || []).find((c) => c.id === grupo?.cliente_id);
    const docFactura = documentoFromFactura(factura);
    const razonFactura = factura?.receptor_razon_social || "";
    if (docFactura || razonFactura) {
      setEditDatosFiscalesAfip({
        documento: docFactura,
        razon_social: razonFactura.trim(),
      });
    } else {
      setEditDatosFiscalesAfip(afipReceptorFromCliente(cliente));
    }
  };

  const handleEditRegistrarEnAfipChange = (checked) => {
    setEditRegistrarEnAfip(checked);
    if (checked && edit.editForm?.cliente_id) {
      setEditDatosFiscalesAfip((prev) => {
        const tieneDatos =
          (prev.documento ?? prev.cuit ?? "").length > 0 ||
          (prev.razon_social || "").trim().length > 0;
        if (tieneDatos) return prev;
        const cliente = (clientes || []).find(
          (c) => c.id === edit.editForm.cliente_id,
        );
        return afipReceptorFromCliente(cliente);
      });
    } else if (!checked) {
      setEditDatosFiscalesAfip({ documento: "", razon_social: "" });
    }
  };

  const abrirEditar = (grupo) => {
    edit.abrirEditar(grupo);
    initAfipEdicion(grupo, null);
    setManualScreenOpen(true);
    const transaccionId = getTransaccionIdFromGrupo(grupo);
    if (transaccionId) {
      refreshFacturas(transaccionId).then((factura) => {
        initAfipEdicion(grupo, factura);
      });
    }
  };

  const guardarEdicionConAfip = async () => {
    const transaccionId = getTransaccionIdFromGrupo(edit.editGrupo);
    const factura = transaccionId
      ? facturasByTransaccion[transaccionId]
      : null;
    const puedeAfip =
      !isVentaRole &&
      editRegistrarEnAfip &&
      facturaPuedeReintentarAfip(factura);

    if (puedeAfip && typeof navigator !== "undefined" && !navigator.onLine) {
      showToast("Para registrar en AFIP necesitás conexión.");
      return;
    }

    let afipReceptor = null;
    if (puedeAfip) {
      const built = buildAfipReceptorPayload(
        editDatosFiscalesAfip,
        edit.editForm?.cliente_id,
        clientes,
      );
      if (!built.ok) {
        showToast(built.error);
        return;
      }
      afipReceptor = built.receptor;
      const cliente = (clientes || []).find(
        (c) => c.id === edit.editForm?.cliente_id,
      );
      const overrideNum =
        edit.editTotalOverride !== "" &&
        !Number.isNaN(
          parseFloat(String(edit.editTotalOverride).replace(",", ".")),
        )
          ? parseFloat(String(edit.editTotalOverride).replace(",", "."))
          : null;
      const totalConfirm =
        overrideNum != null && overrideNum >= 0
          ? overrideNum
          : edit.editCartPromos?.totalFinal ?? edit.editCartTotal;
      const receptorTxt = factura?.receptor_razon_social?.trim();
      const msg = [
        `¿Registrar en AFIP esta venta por ${fmt(totalConfirm)}?`,
        `Cliente: ${cliente?.nombre || "Consumidor final"}`,
        receptorTxt || built.receptor.razon_social !== "Consumidor Final"
          ? `Factura a: ${receptorTxt || built.receptor.razon_social}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      const ok = await confirm(msg);
      if (!ok) return;
    }

    await edit.guardarEdicion(
      puedeAfip
        ? {
            activo: true,
            receptor: afipReceptor,
            invokeAfip: invokeRegistrarEnAfip,
            persistClienteFiscal: persistirDatosFiscalesCliente,
            refreshFacturas,
          }
        : null,
    );
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
      setEditRegistrarEnAfip(false);
      setEditDatosFiscalesAfip({ documento: "", razon_social: "" });
      setEditFacturaEstado(null);
      setEditPuedeRegistrarAfip(true);
    } else {
      resetNuevaVenta();
    }
  };

  const registrarVentaCarrito = async ({ cobroPorDefecto = false } = {}) => {
    if (registerInFlightRef.current) return;

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
    const afipActivo = registrarEnAfip && !cobroPorDefecto;

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

    perfMark("venta:register:start");

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
        const fechaDisplay = new Date(fechaFinal).toLocaleDateString("es-AR");
        resetNuevaVenta();
        showToast(`Guardando pedido…`);
        registerInFlightRef.current = true;
        insertPedidos(rows, { skipToast: true })
          .then(() => {
            showToast(`✅ Pedido guardado para ${fechaDisplay}: ${fmt(subtotalLista)}`);
          })
          .catch((err) => {
            reportError(err, { action: "registrarPedido" });
            showToast("⚠️ Error al guardar pedido");
          })
          .finally(() => {
            registerInFlightRef.current = false;
            perfMark("venta:register:end");
          });
        return;
      }

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
        return;
      }
      const promoLabel = promoResult.aplicadas.map((a) => a.nombre).join(", ");
      if (afipActivo && typeof navigator !== "undefined" && !navigator.onLine) {
        showToast("Para registrar en AFIP necesitás conexión. Desmarcá la opción o volvé a intentar online.");
        return;
      }
      let afipReceptor = null;
      if (afipActivo) {
        const afipBuilt = buildAfipReceptorPayload(
          datosFiscalesAfip,
          clienteEff,
          clientes,
        );
        if (!afipBuilt.ok) {
          showToast(afipBuilt.error);
          return;
        }
        afipReceptor = afipBuilt.receptor;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSaving(true);
        try {
          await saveVentaPendiente(rows);
          resetNuevaVenta();
          showToast(
            `✅ Venta guardada offline: ${fmt(totalCobrado)}${promoLabel ? ` (${promoLabel})` : ""}. Se sincronizará cuando vuelva la conexión.`,
          );
        } catch (err) {
          reportError(err, { action: "registrarVentaCarritoOffline" });
          showToast("⚠️ Error al guardar venta offline");
        } finally {
          setSaving(false);
          perfMark("venta:register:end");
        }
        return;
      }

      resetNuevaVenta();
      showToast(`Registrando venta ${fmt(totalCobrado)}…`);
      registerInFlightRef.current = true;

      const stockDeltas = buildStockDeltasFromRows(rows);
      const pendingRows = withPendingVentaIds(rows, transaccionId);
      const pendingIds = pendingRows.map((r) => r.id);

      if (patchStock && stockDeltas.length) patchStock(stockDeltas);
      if (appendVentas) appendVentas(pendingRows);

      persistVentaOnline(rows, transaccionId, { stockAlreadyPatched: true })
        .then(({ inserted }) => {
          if (resolveOptimisticVentas) {
            resolveOptimisticVentas(transaccionId, inserted, pendingIds);
          } else {
            if (removeVentas && pendingIds.length) removeVentas(pendingIds);
            if (appendVentas && inserted?.length) appendVentas(inserted);
          }
          showToast(`✅ Venta registrada: ${fmt(totalCobrado)}${promoLabel ? ` · ${promoLabel}` : ""}`);
          runAfipAfterVenta(transaccionId, afipReceptor, totalCobrado, afipActivo, clienteEff);
        })
        .catch((err) => {
          if (removeVentas && pendingIds.length) removeVentas(pendingIds);
          if (patchStock && stockDeltas.length) {
            patchStock(
              stockDeltas.map(({ receta_id, delta }) => ({ receta_id, delta: -delta })),
            );
          }
          if (actualizarStockBatch && stockDeltas.length) {
            actualizarStockBatch(
              stockDeltas.map(({ receta_id, delta }) => ({ receta_id, delta: -delta })),
              { useLocalBase: false },
            ).catch((rollbackErr) => {
              reportError(rollbackErr, { action: "rollbackStockDbAfterRegisterFail" });
            });
          }
          reportError(err, { action: "registrarVentaCarrito" });
          showToast("⚠️ Error al registrar venta");
        })
        .finally(() => {
          registerInFlightRef.current = false;
          perfMark("venta:register:end");
        });
    } catch (err) {
      reportError(err, { action: "registrarVentaCarrito" });
      showToast("⚠️ Error al registrar venta");
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
        confirm={confirm}
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

      {(manualScreenOpen || edit.editGrupo) && (
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
          perfMark("cobro:open");
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
        onGuardar={guardarEdicionConAfip}
        editSaving={edit.editSaving}
        showAfip={!isVentaRole}
        editRegistrarEnAfip={editRegistrarEnAfip}
        setEditRegistrarEnAfip={handleEditRegistrarEnAfipChange}
        editDatosFiscalesAfip={editDatosFiscalesAfip}
        setEditDatosFiscalesAfip={setEditDatosFiscalesAfip}
        editFacturaEstado={editFacturaEstado}
        editPuedeRegistrarAfip={editPuedeRegistrarAfip}
        onEditClienteChange={(id) => {
          edit.setEditForm((prev) => ({ ...prev, cliente_id: id }));
          if (editRegistrarEnAfip) {
            setEditDatosFiscalesAfip((prev) => {
              const tieneDatos =
                (prev.documento ?? prev.cuit ?? "").length > 0 ||
                (prev.razon_social || "").trim().length > 0;
              if (tieneDatos) return prev;
              const cliente = (clientes || []).find((c) => c.id === id);
              return afipReceptorFromCliente(cliente);
            });
          }
        }}
        editTotalOverride={edit.editTotalOverride}
        setEditTotalOverride={edit.setEditTotalOverride}
        editCartPromos={edit.editCartPromos}
        editPromosExcluidas={edit.editPromosExcluidas}
        setEditPromosExcluidas={edit.setEditPromosExcluidas}
      />
      )}

      {chargeModalOpen && (
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
        setRegistrarEnAfip={handleRegistrarEnAfipChange}
        datosFiscalesAfip={datosFiscalesAfip}
        setDatosFiscalesAfip={setDatosFiscalesAfip}
        onClienteSelChange={(id) => {
          setClienteSel(id);
          if (registrarEnAfip) prefillDatosFiscalesAfip(id);
        }}
      />
      )}
    </div>
  );
}

export default memo(Ventas);
