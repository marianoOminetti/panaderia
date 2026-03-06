/**
 * Pantalla Ventas: orquesta nueva venta (carrito useVentasCart), cobro (useVentasChargeModal), lista (VentasList),
 * edición de ventas, venta manual (VentasManualScreen) y venta por voz (useVentasVoz). Registro y persistencia aquí.
 */
import { useState, useEffect } from "react";
import { fmt, toCantidadNumber } from "../../lib/format";
import { useVentas } from "../../hooks/useVentas";
import { useClientes } from "../../hooks/useClientes";
import { useVentasVoz } from "../../hooks/useVentasVoz";
import { useVentasCart } from "../../hooks/useVentasCart";
import { useVentasChargeModal } from "../../hooks/useVentasChargeModal";
import { hoyLocalISO } from "../../lib/dates";
import { saveVentaPendiente } from "../../lib/offlineVentas";
import { reportError } from "../../utils/errorReport";
import { agruparVentas, gruposConDeuda as getGruposConDeuda, totalDebeEnGrupo } from "../../lib/agrupadores";
import { notifyEvent } from "../../lib/notifyEvent";
import VentasList from "./VentasList";
import VentasChargeModal from "./VentasChargeModal";
import VentasVoiceModal from "./VentasVoiceModal";
import VentasManualScreen from "./VentasManualScreen";

function generateTransaccionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 compatible
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Normaliza cantidades que pueden venir como number, string, null, etc.

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
}) {
  const { insertVentas, deleteVentas, updateVenta } = useVentas();
  const { insertCliente } = useClientes({ onRefresh, showToast });

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
  const {
    chargeModalOpen,
    chargeTotalOverride,
    setChargeTotalOverride,
    openChargeModal,
    closeChargeModal,
  } = useVentasChargeModal();
  const [editGrupo, setEditGrupo] = useState(null);
  const [editForm, setEditForm] = useState({
    cliente_id: null,
    medio_pago: "efectivo",
    estado_pago: "pagado",
    fecha: null,
  });
  const [editCantidades, setEditCantidades] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editItemsToAdd, setEditItemsToAdd] = useState([]);
  /** receta_ids que el usuario quitó del carrito (en vista agrupada una línea = un producto). */
  const [editRemovedRecetas, setEditRemovedRecetas] = useState([]);
  const [editPrecios, setEditPrecios] = useState({});
  const [editTotalOverride, setEditTotalOverride] = useState("");

  const {
    voiceModal,
    setVoiceModal,
    transcript,
    parsedVentas,
    listening,
    savingVoice,
    iniciarRec,
    detenerVoz,
    registrarVentasVoz,
    abrirVoz,
    SpeechRecognitionAPI,
  } = useVentasVoz({ recetas, setCartItems, showToast });

  const hoy = hoyLocalISO();
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
    if (actualizarStock) {
      try {
        for (const v of rows) {
          const cant = v.cantidad || 0;
          if (v.receta_id && cant > 0) await actualizarStock(v.receta_id, -cant);
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
    closeChargeModal();
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
    setEditGrupo(grupo);
    const primera = grupo.rawItems[0];
    setEditForm({
      cliente_id: grupo.cliente_id || null,
      medio_pago: primera?.medio_pago || "efectivo",
      estado_pago: primera?.estado_pago || "pagado",
      fecha: primera?.fecha || hoyLocalISO(),
    });
    const cantByReceta = {};
    const preciosByReceta = {};
    for (const v of grupo.rawItems) {
      const rid = v.receta_id;
      if (rid == null) continue;
      const c = Math.max(0.1, toCantidadNumber(v.cantidad));
      cantByReceta[rid] = (cantByReceta[rid] || 0) + c;
      if (preciosByReceta[rid] == null) preciosByReceta[rid] = v.precio_unitario ?? 0;
    }
    setEditCantidades(cantByReceta);
    setEditPrecios(preciosByReceta);
    setEditItemsToAdd([]);
    setEditRemovedRecetas([]);
    setEditTotalOverride("");
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
    setVoiceModal(false);
    onConsumedVentasNueva?.();
  }, [ventasNuevaFlag]); // eslint-disable-line react-hooks/exhaustive-deps -- callback estable desde App

  /** Carrito derivado para modo edición: una línea por producto (receta_id), agrupado como nueva venta. */
  const editCartItems = editGrupo
    ? (() => {
        const recetaIds = new Set();
        for (const v of editGrupo.rawItems) {
          if (v.receta_id != null && !editRemovedRecetas.includes(v.receta_id))
            recetaIds.add(v.receta_id);
        }
        for (const it of editItemsToAdd) {
          if (it.receta_id != null) recetaIds.add(it.receta_id);
        }
        return Array.from(recetaIds).map((rid) => {
          const receta = recetas.find((r) => r.id === rid);
          if (!receta) return null;
          const rawCant = editCantidades[rid];
          const cantNum = toCantidadNumber(rawCant ?? 0);
          const qtyFallback = cantNum < 0.1 ? 0.1 : cantNum;
          const precio = editPrecios[rid] ?? receta.precio_venta ?? 0;
          return {
            id: rid,
            receta,
            cantidad: rawCant !== undefined && rawCant !== null ? rawCant : qtyFallback,
            precio_unitario: precio,
          };
        }).filter(Boolean);
      })()
    : [];

  const editCartTotal = editCartItems.reduce((s, item) => {
    const c =
      typeof item.cantidad === "number"
        ? item.cantidad
        : toCantidadNumber(item.cantidad);
    const qty = Math.max(0.1, c);
    return s + (item.precio_unitario || 0) * qty;
  }, 0);

  /** En modo agrupado itemKey es siempre receta_id. Misma lógica de paso que nueva venta: 0.1 por debajo de 1, 1 por encima. */
  const editUpdateQuantity = (recetaId, delta) => {
    setEditCantidades((prev) => {
      const actual = toCantidadNumber(prev[recetaId] ?? 0) || 0.1;
      const sign = delta > 0 ? 1 : -1;
      let step;
      if (sign > 0) {
        step = actual >= 1 ? 1 : 0.1;
      } else {
        // Bajar: por debajo de 2 uso 0.1 (1 → 0.9 → 0.8…); desde 2 o más, de a 1
        step = actual >= 2 ? 1 : 0.1;
      }
      let next = actual + sign * step;
      if (next < 0.1) next = 0.1;
      return { ...prev, [recetaId]: Number(next.toFixed(2)) };
    });
  };

  const editSetQuantity = (recetaId, value) => {
    const text = String(value ?? "").trim().replace(",", ".");
    setEditCantidades((prev) => ({
      ...prev,
      [recetaId]: text === "" ? "" : text,
    }));
  };

  const editRemoveItem = (recetaId) => {
    setEditRemovedRecetas((prev) =>
      prev.includes(recetaId) ? prev : [...prev, recetaId],
    );
  };

  const editUpdatePrice = (recetaId, value) => {
    const text = String(value ?? "").trim();
    if (text === "") {
      setEditPrecios((prev) => {
        const next = { ...prev };
        delete next[recetaId];
        return next;
      });
      return;
    }
    const num = parseFloat(text.replace(",", "."));
    if (Number.isNaN(num) || num < 0) return;
    setEditPrecios((prev) => ({ ...prev, [recetaId]: num }));
  };

  const addToCartForEdit = (receta, cantidad = 1) => {
    if (!receta) return;
    const rid = receta.id;
    const c = Math.max(0.1, toCantidadNumber(cantidad));
    const inRaw =
      editGrupo?.rawItems.some(
        (v) => v.receta_id === rid && !editRemovedRecetas.includes(rid),
      );
    const inAddIdx = editItemsToAdd.findIndex((it) => it.receta_id === rid);
    if (inRaw || inAddIdx >= 0) {
      setEditCantidades((prev) => ({
        ...prev,
        [rid]: (toCantidadNumber(prev[rid]) || 0) + c,
      }));
      setEditPrecios((prev) =>
        prev[rid] != null ? prev : { ...prev, [rid]: receta.precio_venta ?? 0 },
      );
      if (inAddIdx >= 0) {
        setEditItemsToAdd((prev) =>
          prev.map((it, i) =>
            i === inAddIdx
              ? { ...it, cantidad: (toCantidadNumber(it.cantidad) || 0) + c }
              : it,
          ),
        );
      }
    } else {
      setEditItemsToAdd((prev) => [
        ...prev,
        {
          receta_id: rid,
          cantidad: c,
          receta,
          precio_unitario: receta.precio_venta ?? 0,
        },
      ]);
      setEditCantidades((prev) => ({ ...prev, [rid]: c }));
      setEditPrecios((prev) => ({ ...prev, [rid]: receta.precio_venta ?? 0 }));
    }
  };

  const closeManualScreen = () => {
    if (editGrupo) {
      setManualScreenOpen(false);
      setEditGrupo(null);
      setEditCantidades({});
      setEditItemsToAdd([]);
      setEditRemovedRecetas([]);
      setEditPrecios({});
      setEditTotalOverride("");
      setEditForm({
        cliente_id: null,
        medio_pago: "efectivo",
        estado_pago: "pagado",
        fecha: null,
      });
    } else {
      resetNuevaVenta();
    }
  };

  const guardarEdicion = async () => {
    if (!editGrupo) return;
    setEditSaving(true);
    const fechaEdit = (editForm.fecha && editForm.fecha.slice(0, 10)) || hoyLocalISO();
    let transaccionId = editGrupo.rawItems[0]?.transaccion_id;
    if (editItemsToAdd.length > 0 && !transaccionId)
      transaccionId = generateTransaccionId();
    const deltasMap = {};
    const idsToDelete = [];
    for (const rid of editRemovedRecetas) {
      for (const v of editGrupo.rawItems) {
        if (v.receta_id === rid && v.id != null) idsToDelete.push(v.id);
      }
    }
    const rawByReceta = {};
    for (const v of editGrupo.rawItems) {
      if (editRemovedRecetas.includes(v.receta_id)) continue;
      if (!rawByReceta[v.receta_id]) rawByReceta[v.receta_id] = [];
      rawByReceta[v.receta_id].push(v);
    }
    for (const rid of Object.keys(rawByReceta)) {
      const raws = rawByReceta[rid];
      const nuevaCant = Math.max(0.1, toCantidadNumber(editCantidades[rid] ?? 0));
      const cantOrig = raws.reduce((s, v) => s + toCantidadNumber(v.cantidad), 0);
      const deltaCant = nuevaCant - cantOrig;
      if (deltaCant !== 0) {
        deltasMap[rid] = (deltasMap[rid] || 0) - deltaCant;
      }
      if (raws.length > 1) {
        for (let i = 1; i < raws.length; i++) idsToDelete.push(raws[i].id);
      }
    }
    const addByReceta = {};
    for (const it of editItemsToAdd) {
      if (!it.receta_id) continue;
      const c = Math.max(0.1, toCantidadNumber(editCantidades[it.receta_id] ?? it.cantidad));
      addByReceta[it.receta_id] = {
        cantidad: c,
        receta: it.receta,
        precio: editPrecios[it.receta_id] ?? it.precio_unitario ?? it.receta?.precio_venta ?? 0,
      };
      if (c > 0) deltasMap[it.receta_id] = (deltasMap[it.receta_id] || 0) - c;
    }
    const stockDeltas = Object.entries(deltasMap)
      .filter(([, d]) => d !== 0)
      .map(([receta_id, delta]) => ({ receta_id, delta }));

    // Líneas para total: existentes + nuevas (misma lógica que nueva venta para override)
    const lineas = [];
    for (const rid of Object.keys(rawByReceta)) {
      const raws = rawByReceta[rid];
      const first = raws[0];
      const nuevaCant = Math.max(0.1, toCantidadNumber(editCantidades[rid] ?? 0));
      const precio = editPrecios[rid] ?? first.precio_unitario ?? 0;
      lineas.push({ rid, cant: nuevaCant, precio, key: `raw-${rid}` });
    }
    for (const [rid, { cantidad, receta, precio }] of Object.entries(addByReceta)) {
      const cantNum = Math.max(0.1, toCantidadNumber(cantidad));
      const p = precio ?? receta?.precio_venta ?? 0;
      lineas.push({ rid, cant: cantNum, precio: p, key: `add-${rid}` });
    }
    const totalCart = lineas.reduce((s, l) => s + l.cant * l.precio, 0);
    const overrideVal = parseFloat(String(editTotalOverride || "").replace(",", "."));
    const usarOverride =
      !Number.isNaN(overrideVal) &&
      overrideVal >= 0 &&
      totalCart > 0 &&
      overrideVal !== totalCart;
    if (
      !Number.isNaN(overrideVal) &&
      overrideVal > 0 &&
      totalCart === 0
    ) {
      showToast("Para aplicar un total final, asigná precios mayores a 0 en el carrito.");
      setEditSaving(false);
      return;
    }
    const preciosAjustados = {};
    if (usarOverride) {
      let acumulado = 0;
      lineas.forEach((l, i) => {
        const nuevoSubtotal =
          i === lineas.length - 1
            ? overrideVal - acumulado
            : Math.round((l.cant * l.precio * overrideVal) / totalCart);
        preciosAjustados[l.key] = l.cant > 0 ? nuevoSubtotal / l.cant : l.precio;
        acumulado += nuevoSubtotal;
      });
    }

    try {
      if (stockDeltas.length > 0 && actualizarStockBatch) {
        await actualizarStockBatch(stockDeltas);
      } else if (stockDeltas.length > 0 && actualizarStock) {
        for (const { receta_id, delta } of stockDeltas) {
          await actualizarStock(receta_id, delta);
        }
      }
      try {
        for (const rid of Object.keys(rawByReceta)) {
          const raws = rawByReceta[rid];
          const first = raws[0];
          const nuevaCant = Math.max(0.1, toCantidadNumber(editCantidades[rid] ?? 0));
          const precioBase = editPrecios[rid] ?? first.precio_unitario ?? 0;
          const precio = preciosAjustados[`raw-${rid}`] ?? precioBase;
          const subtotal = precio * nuevaCant;
          const payload = {
            cliente_id: editForm.cliente_id || null,
            medio_pago: editForm.medio_pago,
            estado_pago: editForm.estado_pago,
            fecha: fechaEdit,
            cantidad: nuevaCant,
            precio_unitario: precio,
            subtotal,
            total_final: usarOverride ? subtotal : subtotal - (first.descuento ?? 0),
          };
          if (Object.keys(addByReceta).length > 0) payload.transaccion_id = transaccionId;
          await updateVenta(first.id, payload);
        }
        if (idsToDelete.length > 0) {
          await deleteVentas(idsToDelete);
        }
        if (Object.keys(addByReceta).length > 0) {
          const rows = Object.entries(addByReceta).map(([receta_id, { cantidad, receta, precio }]) => {
            const cantNum = Math.max(0.1, toCantidadNumber(cantidad));
            const pBase = precio ?? receta?.precio_venta ?? 0;
            const p = preciosAjustados[`add-${receta_id}`] ?? pBase;
            const subtotal = p * cantNum;
            return {
              receta_id,
              cantidad: cantNum,
              precio_unitario: p,
              subtotal,
              descuento: 0,
              total_final: subtotal,
              fecha: fechaEdit,
              transaccion_id: transaccionId,
              cliente_id: editForm.cliente_id || null,
              medio_pago: editForm.medio_pago,
              estado_pago: editForm.estado_pago,
            };
          });
          await insertVentas(rows);
        }
      } catch (ventaErr) {
        if (stockDeltas.length > 0) {
          const undo = stockDeltas.map(({ receta_id, delta }) => ({ receta_id, delta: -delta }));
          try {
            if (actualizarStockBatch) await actualizarStockBatch(undo);
            else for (const { receta_id, delta } of undo) await actualizarStock(receta_id, delta);
          } catch (rollbackErr) {
            reportError(rollbackErr, { action: "rollbackStockAfterGuardarEdicionFail" });
          }
        }
        throw ventaErr;
      }
      showToast("✅ Venta actualizada");
      setManualScreenOpen(false);
      setEditGrupo(null);
      setEditCantidades({});
      setEditItemsToAdd([]);
      setEditRemovedRecetas([]);
      setEditPrecios({});
      setEditTotalOverride("");
      onRefresh();
    } catch (err) {
      reportError(err, { action: "guardarEdicion", grupo: editGrupo?.key });
      showToast("⚠️ Error al actualizar venta");
    } finally {
      setEditSaving(false);
    }
  };

  const registrarVentaCarrito = async () => {
    if (cartItems.length === 0) {
      showToast("Agregá productos al carrito primero.");
      return;
    }
    const sinStock = cartItems.filter(
      ({ receta, cantidad }) =>
        ((stock || {})[receta.id] ?? 0) < (toCantidadNumber(cantidad) || 0),
    );
    if (sinStock.length > 0 && !(await confirm(`Stock insuficiente en ${sinStock.map((s) => s.receta.nombre).join(", ")}. ¿Registrar venta igual?`)))
      return;
    setSaving(true);
    try {
      const hoyVenta = hoyLocalISO();
      const totalCarrito = cartItems.reduce((s, it) => {
        const cant = toCantidadNumber(it.cantidad) || 0;
        return s + (it.precio_unitario || 0) * cant;
      }, 0);
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
          fecha: hoyVenta,
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
        await registrarVentaEnSupabase(rows, transaccionId);
        showToast(`✅ Venta registrada: ${fmt(usarOverride ? override : totalCarrito)}`);
      }
      resetNuevaVenta();
      onRefresh();
    } catch (err) {
      reportError(err, { action: "registrarVentaCarrito" });
      showToast("⚠️ Error al registrar venta");
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

      <VentasVoiceModal
        open={voiceModal}
        onClose={() => setVoiceModal(false)}
        transcript={transcript}
        parsedVentas={parsedVentas}
        listening={listening}
        savingVoice={savingVoice}
        onDetener={detenerVoz}
        onIniciarRec={iniciarRec}
        onAgregarMasVoz={() => SpeechRecognitionAPI && iniciarRec(true)}
        onAgregarAlCarrito={registrarVentasVoz}
      />

      {!manualScreenOpen && !voiceModal && (
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
        mode={editGrupo ? "edit" : "new"}
        cartItems={cartItems}
        cartTotal={cartTotal}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        updateCartPrice={updateCartPrice}
        setCartQuantity={setCartQuantity}
        recetas={recetas}
        stock={stock}
        addToCart={editGrupo ? addToCartForEdit : addToCart}
        onVoz={abrirVoz}
        onCobrar={() => {
          if (cartItems.length === 0) return;
          openChargeModal();
        }}
        editCartItems={editCartItems}
        editCartTotal={editCartTotal}
        editUpdateQuantity={editUpdateQuantity}
        editRemoveItem={editRemoveItem}
        editSetQuantity={editSetQuantity}
        editUpdatePrice={editUpdatePrice}
        editForm={editForm}
        setEditForm={setEditForm}
        clientes={clientes}
        insertCliente={insertCliente}
        showToast={showToast}
        onGuardar={guardarEdicion}
        editSaving={editSaving}
        editTotalOverride={editTotalOverride}
        setEditTotalOverride={setEditTotalOverride}
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
      />
    </div>
  );
}

export default Ventas;
