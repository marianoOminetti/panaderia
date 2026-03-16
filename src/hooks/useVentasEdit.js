/**
 * Hook para edición de ventas: estado, carrito derivado y guardarEdicion.
 * Usado por Ventas.jsx.
 */
import { useState, useMemo } from "react";
import { toCantidadNumber } from "../lib/format";
import { generateTransaccionId } from "../lib/ventas";
import { reportError } from "../utils/errorReport";

export function useVentasEdit({
  recetas,
  updateVenta,
  deleteVentas,
  insertVentas,
  actualizarStock,
  actualizarStockBatch,
  showToast,
  onRefresh,
  hoy,
  onCloseEdit,
}) {
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
  const [editSaving, setEditSaving] = useState(false);

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
  };

  const closeEdit = () => {
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

  const guardarEdicion = async () => {
    if (!editGrupo) return;
    setEditSaving(true);
    const fechaEdit = (editForm.fecha && editForm.fecha.slice(0, 10)) || hoy;
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
      closeEdit();
      onRefresh();
    } catch (err) {
      reportError(err, { action: "guardarEdicion", grupo: editGrupo?.key });
      showToast("⚠️ Error al actualizar venta");
    } finally {
      setEditSaving(false);
    }
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
  };
}
