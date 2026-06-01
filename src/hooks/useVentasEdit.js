/**
 * Hook para edición de ventas: estado, carrito derivado y guardarEdicion.
 * Usado por Ventas.jsx.
 */
import { useState, useMemo } from "react";
import { toCantidadNumber, fmt } from "../lib/format";
import { generateTransaccionId } from "../lib/ventas";
import { buildVentaRowsConPromos } from "../lib/buildVentaRowsConPromos";
import { calcularPromosEnCarrito } from "../lib/promociones";
import { useCartConPromos } from "./useCartConPromos";
import { reportError } from "../utils/errorReport";

export function useVentasEdit({
  recetas,
  promociones = [],
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
  const [editPromosExcluidas, setEditPromosExcluidas] = useState([]);
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
    const subtotalLista = tempCart.reduce((s, it) => {
      const c = toCantidadNumber(it.cantidad) || 0;
      return s + (Number(it.precio_unitario) || 0) * c;
    }, 0);
    const teniaDescuento = grupo.total < subtotalLista - 0.01;
    const preview = calcularPromosEnCarrito(tempCart, promociones);
    const promosGuardadas = new Set(
      grupo.rawItems.map((r) => r.promocion_id).filter(Boolean),
    );
    let excluidas = [];
    if (!teniaDescuento && preview.descuentoTotal > 0) {
      excluidas = preview.aplicadas.map((a) => a.promocion_id);
    } else if (promosGuardadas.size > 0) {
      excluidas = preview.aplicadas
        .filter((a) => !promosGuardadas.has(a.promocion_id))
        .map((a) => a.promocion_id);
    }
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

    if (editCartItems.length === 0) {
      showToast("Agregá al menos un producto");
      setEditSaving(false);
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
      setEditSaving(false);
      return;
    }

    const rowByReceta = Object.fromEntries(
      built.rows.map((r) => [r.receta_id, r]),
    );

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
          if (rows.length > 0) await insertVentas(rows);
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
      const promoLabel = built.promoResult.aplicadas.map((a) => a.nombre).join(", ");
      showToast(
        `✅ Venta actualizada: ${fmt(built.totalCobrado)}${promoLabel ? ` · ${promoLabel}` : ""}`,
      );
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
    editCartPromos,
    editPromosExcluidas,
    setEditPromosExcluidas,
  };
}
