/**
 * Hook para edición de pedidos: carrito derivado y guardar.
 */
import { useState, useMemo, useRef } from "react";
import { isCantidadEnEdicion, toCantidadNumber } from "../lib/format";
import { buildPedidoRowsConPromos } from "../lib/buildPedidoRowsConPromos";
import { calcularPromosEnCarrito } from "../lib/promociones";
import { useCartConPromos } from "./useCartConPromos";
import { reportError } from "../utils/errorReport";

export function usePedidosEdit({
  recetas,
  promociones = [],
  replacePedidosByPedidoId,
  showToast,
  onCloseEdit,
}) {
  const editInFlightRef = useRef(false);
  const [editGrupo, setEditGrupo] = useState(null);
  const [editForm, setEditForm] = useState({
    cliente_id: null,
    fecha_entrega: null,
    senia: "",
    hora_entrega: "",
    notas: "",
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
    const primera = grupo.rawItems?.[0] || {};
    setEditForm({
      cliente_id: grupo.cliente_id || null,
      fecha_entrega: grupo.fecha_entrega
        ? String(grupo.fecha_entrega).slice(0, 10)
        : null,
      senia: grupo.senia > 0 ? String(grupo.senia) : "",
      hora_entrega: primera.hora_entrega || grupo.hora_entrega || "",
      notas: primera.notas || grupo.notas || "",
    });
    const cantByReceta = {};
    const preciosByReceta = {};
    for (const v of grupo.rawItems || []) {
      const rid = v.receta_id;
      if (rid == null) continue;
      const c = Math.max(0.1, toCantidadNumber(v.cantidad));
      cantByReceta[rid] = (cantByReceta[rid] || 0) + c;
      if (preciosByReceta[rid] == null) {
        preciosByReceta[rid] = v.precio_unitario ?? 0;
      }
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
    const preview = calcularPromosEnCarrito(tempCart, promociones, {
      clienteId: grupo.cliente_id || null,
    });
    const promosGuardadas = new Set(
      (grupo.rawItems || []).map((r) => r.promocion_id).filter(Boolean),
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
      fecha_entrega: null,
      senia: "",
      hora_entrega: "",
      notas: "",
    });
    onCloseEdit?.();
  };

  const editCartItems = useMemo(() => {
    if (!editGrupo) return [];
    const recetaIds = new Set();
    for (const v of editGrupo.rawItems || []) {
      if (v.receta_id != null && !editRemovedRecetas.includes(v.receta_id)) {
        recetaIds.add(v.receta_id);
      }
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
  }, [
    editGrupo,
    editCantidades,
    editItemsToAdd,
    editRemovedRecetas,
    editPrecios,
    recetas,
  ]);

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
    editForm.cliente_id || null,
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
    const inRaw = editGrupo?.rawItems?.some(
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
    if (editInFlightRef.current) {
      showToast?.("Guardando cambios del pedido anterior…");
      return;
    }
    if (!editForm.cliente_id) {
      showToast?.("Para pedidos es obligatorio elegir un cliente");
      return;
    }
    if (!editForm.fecha_entrega) {
      showToast?.("Elegí la fecha de entrega");
      return;
    }
    if (editCartItems.length === 0) {
      showToast?.("Agregá al menos un producto");
      return;
    }

    const seniaNum =
      parseFloat(String(editForm.senia || "").replace(",", ".")) || 0;
    const built = buildPedidoRowsConPromos({
      cartItems: editCartItems,
      promociones,
      excludePromoIds: editPromosExcluidas,
      chargeTotalOverride: editTotalOverride,
      pedidoId: editGrupo.key,
      clienteId: editForm.cliente_id,
      fechaEntrega: editForm.fecha_entrega,
      senia: seniaNum,
      horaEntrega: editForm.hora_entrega || null,
      notas: editForm.notas || null,
      estado: editGrupo.estado || "pendiente",
    });

    editInFlightRef.current = true;
    setEditSaving(true);
    showToast?.("Guardando pedido…");
    try {
      await replacePedidosByPedidoId(editGrupo.key, built.rows);
      showToast?.("✅ Pedido actualizado");
      closeEdit();
    } catch (err) {
      reportError(err, { action: "guardarEdicionPedido", pedido_id: editGrupo.key });
      showToast?.("⚠️ No se pudo guardar el pedido");
    } finally {
      editInFlightRef.current = false;
      setEditSaving(false);
    }
  };

  return {
    editGrupo,
    abrirEditar,
    closeEdit,
    editForm,
    setEditForm,
    editCartItems,
    editCartTotal,
    editCartPromos,
    editPromosExcluidas,
    setEditPromosExcluidas,
    editUpdateQuantity,
    editSetQuantity,
    editRemoveItem,
    editUpdatePrice,
    addToCartForEdit,
    editTotalOverride,
    setEditTotalOverride,
    editSaving,
    guardarEdicion,
  };
}
