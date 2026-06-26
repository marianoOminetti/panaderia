/**
 * Hook para edición de ventas: estado, carrito derivado y guardarEdicion.
 * Usado por Ventas.jsx.
 */
import { useState, useMemo, useRef } from "react";
import { isCantidadEnEdicion, toCantidadNumber, fmt } from "../lib/format";
import { generateTransaccionId, isPendingVentaId } from "../lib/ventas";
import { enqueueVentaWrite } from "../lib/ventaWriteQueue";
import { buildVentaRowsConPromos } from "../lib/buildVentaRowsConPromos";
import { calcularPromosEnCarrito } from "../lib/promociones";
import { useCartConPromos } from "./useCartConPromos";
import { notifyEvent } from "../lib/notifyEvent";
import { reportError } from "../utils/errorReport";

export function useVentasEdit({
  recetas,
  promociones = [],
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
  onCloseEdit,
}) {
  const editInFlightRef = useRef(false);
  const [editGrupo, setEditGrupo] = useState(null);
  const [editForm, setEditForm] = useState({
    cliente_id: null,
    medio_pago: "efectivo",
    estado_pago: "pagado",
    fecha: null,
  });
  const [editCantidades, setEditCantidades] = useState({});
  const [editItemsToAdd, setEditItemsToAdd] = useState([]);
  const [editRemovedRecetas, setEditRemovedRecetas] = useState([]);
  const [editPrecios, setEditPrecios] = useState({});
  const [editTotalOverride, setEditTotalOverride] = useState("");
  const [editPromosExcluidas, setEditPromosExcluidas] = useState([]);
  const [editSaving] = useState(false);

  const abrirEditar = (grupo) => {
    setEditGrupo(grupo);
    const primera = grupo.rawItems[0];
    setEditForm({
      cliente_id: grupo.cliente_id || null,
      medio_pago: primera?.medio_pago || "efectivo",
      estado_pago: primera?.estado_pago || "pagado",
      fecha: primera?.fecha || hoy,
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

    const tempCart = Object.entries(cantByReceta)
      .map(([rid, cant]) => {
        const receta = recetas?.find((r) => r.id === rid);
        if (!receta) return null;
        return {
          receta,
          cantidad: cant,
          precio_unitario: preciosByReceta[rid] ?? receta.precio_venta ?? 0,
        };
      })
      .filter(Boolean);
    const preview = calcularPromosEnCarrito(tempCart, promociones);
    const promosGuardadas = new Set(
      grupo.rawItems.map((r) => r.promocion_id).filter(Boolean),
    );
    const excluidas =
      promosGuardadas.size > 0
        ? preview.aplicadas
            .filter((a) => !promosGuardadas.has(a.promocion_id))
            .map((a) => a.promocion_id)
        : [];
    setEditPromosExcluidas(excluidas);
  };

  const closeEdit = () => {
    setEditGrupo(null);
    setEditCantidades({});
    setEditItemsToAdd([]);
    setEditRemovedRecetas([]);
    setEditPrecios({});
    setEditTotalOverride("");
    setEditPromosExcluidas([]);
    setEditForm({
      cliente_id: null,
      medio_pago: "efectivo",
      estado_pago: "pagado",
      fecha: null,
    });
    onCloseEdit?.();
  };

  const editCartItems = useMemo(() => {
    if (!editGrupo) return [];
    const recetaIds = new Set();
    for (const v of editGrupo.rawItems) {
      if (v.receta_id != null && !editRemovedRecetas.includes(v.receta_id))
        recetaIds.add(v.receta_id);
    }
    for (const it of editItemsToAdd) {
      if (it.receta_id != null) recetaIds.add(it.receta_id);
    }
    return Array.from(recetaIds)
      .map((rid) => {
        const receta = recetas?.find((r) => r.id === rid);
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
      })
      .filter(Boolean);
  }, [editGrupo, editCantidades, editItemsToAdd, editRemovedRecetas, editPrecios, recetas]);

  const editCartTotal = editCartItems.reduce((s, item) => {
    const c =
      typeof item.cantidad === "number"
        ? item.cantidad
        : toCantidadNumber(item.cantidad);
    const qty = Math.max(0.1, c);
    return s + (item.precio_unitario || 0) * qty;
  }, 0);

  const editCartPromos = useCartConPromos(
    editCartItems,
    promociones,
    editPromosExcluidas,
  );

  const editUpdateQuantity = (recetaId, delta) => {
    setEditCantidades((prev) => {
      const actual = toCantidadNumber(prev[recetaId] ?? 0) || 0.1;
      const sign = delta > 0 ? 1 : -1;
      let step;
      if (sign > 0) {
        step = actual >= 1 ? 1 : 0.1;
      } else {
        step = actual >= 2 ? 1 : 0.1;
      }
      let next = actual + sign * step;
      if (next < 0.1) next = 0.1;
      return { ...prev, [recetaId]: Number(next.toFixed(2)) };
    });
  };

  const editSetQuantity = (recetaId, value) => {
    const text = String(value ?? "").trim().replace(",", ".");
    if (isCantidadEnEdicion(text)) {
      setEditCantidades((prev) => ({ ...prev, [recetaId]: text }));
      return;
    }
    const num = parseFloat(text);
    if (!Number.isFinite(num)) return;
    const cantidad = num < 0.1 ? 0.1 : Number(num.toFixed(2));
    setEditCantidades((prev) => ({ ...prev, [recetaId]: cantidad }));
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

  const guardarEdicion = async (afipOpts = null) => {
    if (!editGrupo) return;
    if (editInFlightRef.current) {
      showToast("Guardando cambios de la venta anterior…");
      return;
    }
    const fechaEdit = (editForm.fecha && editForm.fecha.slice(0, 10)) || hoy;
    let transaccionId = editGrupo.rawItems[0]?.transaccion_id;
    if (editItemsToAdd.length > 0 && !transaccionId)
      transaccionId = generateTransaccionId();
    const deltasMap = {};
    const idsToDelete = [];
    for (const rid of editRemovedRecetas) {
      for (const v of editGrupo.rawItems) {
        if (v.receta_id === rid && v.id != null && !isPendingVentaId(v.id)) {
          idsToDelete.push(v.id);
        }
      }
    }
    const rawByReceta = {};
    for (const v of editGrupo.rawItems) {
      if (isPendingVentaId(v.id)) continue;
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
        for (let i = 1; i < raws.length; i++) {
          if (!isPendingVentaId(raws[i].id)) idsToDelete.push(raws[i].id);
        }
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

    if (editCartItems.length === 0) {
      showToast("Agregá al menos un producto");
      return;
    }

    const built = buildVentaRowsConPromos({
      cartItems: editCartItems,
      promociones,
      excludePromoIds: editPromosExcluidas,
      chargeTotalOverride: editTotalOverride,
      fecha: fechaEdit,
      transaccionId,
      clienteId: editForm.cliente_id,
      medioPago: editForm.medio_pago,
      estadoPago: editForm.estado_pago,
    });

    if (
      built.subtotalLista === 0 &&
      editTotalOverride !== "" &&
      !Number.isNaN(parseFloat(String(editTotalOverride).replace(",", "."))) &&
      parseFloat(String(editTotalOverride).replace(",", ".")) > 0
    ) {
      showToast("Para aplicar un total final, asigná precios mayores a 0 en el carrito.");
      return;
    }

    const rowByReceta = Object.fromEntries(
      built.rows.map((r) => [r.receta_id, r]),
    );

    const updatedRows = Object.keys(rawByReceta)
      .map((rid) => {
        const first = rawByReceta[rid]?.[0];
        const row = rowByReceta[rid];
        if (!first?.id || !row) return null;
        return { ...first, ...row, id: first.id, receta_id: rid };
      })
      .filter(Boolean);

    const pendingNewRows = Object.keys(addByReceta)
      .map((rid) => {
        const row = rowByReceta[rid];
        if (!row) return null;
        return {
          ...row,
          id: `pending-edit-${transaccionId}-${rid}`,
          created_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    const removedSnapshot = editGrupo.rawItems.filter((v) => idsToDelete.includes(v.id));
    const originalUpdatedRows = Object.keys(rawByReceta)
      .map((rid) => rawByReceta[rid]?.[0])
      .filter(Boolean);
    const promoLabel = built.promoResult.aplicadas.map((a) => a.nombre).join(", ");
    const totalCobrado = built.totalCobrado;
    const clienteIdSnapshot = editForm.cliente_id;
    const grupoKey = editGrupo?.key;

    const rollbackOptimistic = () => {
      if (removeVentas && pendingNewRows.length) {
        removeVentas(pendingNewRows.map((r) => r.id));
      }
      if (appendVentas && removedSnapshot.length) appendVentas(removedSnapshot);
      if (replaceVentas && originalUpdatedRows.length) replaceVentas(originalUpdatedRows);
      if (patchStock && stockDeltas.length) {
        patchStock(
          stockDeltas.map(({ receta_id, delta }) => ({ receta_id, delta: -delta })),
        );
      }
    };

    if (patchStock && stockDeltas.length) patchStock(stockDeltas);
    if (removeVentas && idsToDelete.length) removeVentas(idsToDelete);
    if (replaceVentas && updatedRows.length) replaceVentas(updatedRows);
    if (appendVentas && pendingNewRows.length) appendVentas(pendingNewRows);

    closeEdit();
    showToast("Guardando cambios…");
    editInFlightRef.current = true;

    enqueueVentaWrite(async () => {
      try {
        if (stockDeltas.length > 0 && actualizarStockBatch) {
          await actualizarStockBatch(stockDeltas, { useLocalBase: true });
        } else if (stockDeltas.length > 0 && actualizarStock) {
          for (const { receta_id, delta } of stockDeltas) {
            await actualizarStock(receta_id, delta);
          }
        }

        let insertedNew = [];
        for (const rid of Object.keys(rawByReceta)) {
          const raws = rawByReceta[rid];
          const first = raws[0];
          const row = rowByReceta[rid];
          if (!row) continue;
          const payload = {
            cliente_id: row.cliente_id,
            medio_pago: row.medio_pago,
            estado_pago: row.estado_pago,
            fecha: row.fecha,
            cantidad: row.cantidad,
            precio_unitario: row.precio_unitario,
            subtotal: row.subtotal,
            descuento: row.descuento ?? 0,
            total_final: row.total_final,
            promocion_id: row.promocion_id ?? null,
          };
          if (Object.keys(addByReceta).length > 0) payload.transaccion_id = transaccionId;
          await updateVenta(first.id, payload);
        }
        if (idsToDelete.length > 0) {
          await deleteVentas(idsToDelete);
        }
        if (Object.keys(addByReceta).length > 0) {
          const rows = Object.keys(addByReceta)
            .map((receta_id) => rowByReceta[receta_id])
            .filter(Boolean);
          if (rows.length > 0) {
            insertedNew = await insertVentas(rows, { idempotent: false });
          }
        }

        if (typeof navigator !== "undefined" && navigator.onLine) {
          const ventaIds = [
            ...Object.keys(rawByReceta)
              .map((rid) => rawByReceta[rid]?.[0]?.id)
              .filter(Boolean),
            ...(insertedNew || []).map((r) => r.id).filter(Boolean),
          ];
          notifyEvent("venta_modificada", {
            venta_ids: ventaIds,
            ...(ventaIds.length === 0 && transaccionId
              ? { transaccion_id: transaccionId }
              : {}),
          }).catch(() => {});
        }

        if (pendingNewRows.length && resolveOptimisticVentas) {
          resolveOptimisticVentas(
            transaccionId,
            insertedNew,
            pendingNewRows.map((r) => r.id),
          );
        } else {
          if (removeVentas && pendingNewRows.length) {
            removeVentas(pendingNewRows.map((r) => r.id));
          }
          if (appendVentas && insertedNew.length) appendVentas(insertedNew);
        }

        showToast(
          `✅ Venta actualizada: ${fmt(totalCobrado)}${promoLabel ? ` · ${promoLabel}` : ""}`,
        );

        if (afipOpts?.activo && transaccionId) {
          if (afipOpts.receptor && clienteIdSnapshot && afipOpts.persistClienteFiscal) {
            afipOpts.persistClienteFiscal(clienteIdSnapshot, afipOpts.receptor).catch(() => {});
          }
          afipOpts
            .invokeAfip(transaccionId, afipOpts.receptor)
            .then(async (afip) => {
              if (afipOpts.refreshFacturas) await afipOpts.refreshFacturas();
              if (afip?.ok) {
                showToast(
                  afip.mock
                    ? `✅ AFIP (prueba) · ${fmt(totalCobrado)}`
                    : `✅ Registrado en AFIP · ${fmt(totalCobrado)}`,
                );
              } else {
                const detalle = afip?.error
                  ? String(afip.error).slice(0, 120)
                  : "no se pudo registrar";
                showToast(`⚠️ AFIP: ${detalle} (la venta sí quedó guardada)`);
              }
            })
            .catch((afipErr) => {
              reportError(afipErr, { action: "registrarEnAfipEdicion", transaccionId });
              showToast("⚠️ AFIP: error de conexión (la venta sí quedó guardada)");
            });
        }
      } catch (err) {
        rollbackOptimistic();
        if (stockDeltas.length && actualizarStockBatch) {
          try {
            await actualizarStockBatch(
              stockDeltas.map(({ receta_id, delta }) => ({ receta_id, delta: -delta })),
              { useLocalBase: false },
            );
          } catch (rollbackErr) {
            reportError(rollbackErr, { action: "rollbackStockAfterGuardarEdicionFail" });
          }
        }
        onRefresh?.();
        reportError(err, { action: "guardarEdicion", grupo: grupoKey });
        const msg = (err?.message || err?.code || "Error").slice(0, 100);
        showToast(`⚠️ Error al actualizar venta: ${msg}`);
      } finally {
        editInFlightRef.current = false;
      }
    });
  };

  return {
    editGrupo,
    editForm,
    setEditForm,
    editCantidades,
    editItemsToAdd,
    editRemovedRecetas,
    editPrecios,
    editTotalOverride,
    setEditTotalOverride,
    editSaving,
    abrirEditar,
    closeEdit,
    editCartItems,
    editCartTotal,
    editUpdateQuantity,
    editSetQuantity,
    editRemoveItem,
    editUpdatePrice,
    addToCartForEdit,
    guardarEdicion,
    editCartPromos,
    editPromosExcluidas,
    setEditPromosExcluidas,
  };
}
