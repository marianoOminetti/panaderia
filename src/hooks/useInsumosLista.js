import { useState, useCallback, useMemo } from "react";
import { reportError } from "../utils/errorReport";
import { costoReceta } from "../lib/costos";
import { parseDecimal } from "../lib/format";

const FORM_INITIAL = {
  nombre: "",
  categoria: "Harinas",
  presentacion: "",
  precio: "",
  cantidad_presentacion: "",
  unidad: "g",
};

/**
 * Estado y lógica de la lista de insumos: filtros, modal ABM, modal movimiento, detalle y composición.
 * Recibe insumos, insumoStock y callbacks del padre (useInsumos) y devuelve estado + handlers.
 */
export function useInsumosLista({
  insumos,
  insumoStock,
  recetas,
  recetaIngredientes,
  updateInsumo,
  insertInsumo,
  insertPrecioHistorial,
  updateRecetaCostos,
  registrarMovimientoInsumo,
  deleteInsumo,
  onRefresh,
  showToast,
  confirm,
}) {
  const [search, setSearch] = useState("");
  const [catActiva, setCatActiva] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_INITIAL);
  const [movModal, setMovModal] = useState(false);
  const [movInsumo, setMovInsumo] = useState(null);
  const [movTipo, setMovTipo] = useState("ingreso");
  const [movCantidad, setMovCantidad] = useState("");
  const [movValor, setMovValor] = useState("");
  const [movSaving, setMovSaving] = useState(false);
  const [detalleInsumo, setDetalleInsumo] = useState(null);

  const filtrados = useMemo(() => {
    return insumos.filter((i) => {
      const matchCat = catActiva === "Todos" || i.categoria === catActiva;
      const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [insumos, catActiva, search]);

  const filtradosOrdenados = useMemo(() => {
    return [...filtrados].slice().sort((a, b) => {
      const sa = (insumoStock || {})[a.id] ?? 0;
      const sb = (insumoStock || {})[b.id] ?? 0;
      if (sa !== sb) return sa - sb;
      return (a.nombre || "").localeCompare(b.nombre || "", "es", {
        sensitivity: "base",
      });
    });
  }, [filtrados, insumoStock]);

  const openNew = useCallback(() => {
    setEditando(null);
    setForm(FORM_INITIAL);
    setModal(true);
  }, []);

  const openEdit = useCallback((i) => {
    setEditando(i);
    setForm({
      nombre: i.nombre,
      categoria: i.categoria,
      presentacion: i.presentacion || "",
      precio: i.precio,
      cantidad_presentacion: i.cantidad_presentacion,
      unidad: i.unidad,
    });
    setModal(true);
  }, []);

  const openMov = useCallback((i, tipo) => {
    setMovInsumo(i);
    setMovTipo(tipo);
    setMovCantidad("");
    setMovValor("");
    setMovModal(true);
  }, []);

  const save = useCallback(async () => {
    const precio = parseDecimal(form.precio);
    const cantidad_presentacion =
      parseDecimal(form.cantidad_presentacion) ?? 0;
    if (precio == null || !Number.isFinite(precio) || precio <= 0) {
      showToast("⚠️ Precio inválido");
      return;
    }
    setSaving(true);
    const data = {
      nombre: form.nombre,
      categoria: form.categoria,
      presentacion: form.presentacion,
      precio,
      cantidad_presentacion,
      unidad: form.unidad,
    };
    const isUpdate = Boolean(editando);
    const precioAnterior =
      isUpdate && editando
        ? typeof editando.precio === "number"
          ? editando.precio
          : parseDecimal(editando.precio) ?? 0
        : null;
    try {
      if (isUpdate) {
        await updateInsumo(editando.id, data);
      } else {
        await insertInsumo(data);
      }
    } catch {
      showToast("⚠️ Error al guardar");
      setSaving(false);
      return;
    }
    const insumoId = isUpdate ? editando.id : null;
    const precioChanged =
      isUpdate &&
      precioAnterior != null &&
      Math.abs(precio - precioAnterior) >= 0.01;
    const cantidadAnterior =
      isUpdate && editando
        ? parseDecimal(editando.cantidad_presentacion) ?? 0
        : null;
    const cantidadChanged =
      isUpdate && cantidadAnterior != null
        ? Math.abs(cantidad_presentacion - cantidadAnterior) >= 0.0001
        : false;
    const unidadAnterior = isUpdate && editando ? String(editando.unidad || "") : "";
    const unidadChanged = isUpdate ? String(form.unidad || "") !== unidadAnterior : false;

    let successMessage = isUpdate
      ? precioChanged
        ? "✅ Precio actualizado"
        : "✅ Insumo actualizado"
      : "✅ Insumo agregado";

    if (isUpdate && precioChanged) {
      try {
        await insertPrecioHistorial({
          insumo_id: insumoId,
          precio_anterior: precioAnterior,
          precio_nuevo: precio,
          motivo: "edicion_manual",
        });
      } catch (err) {
        reportError(err, { action: "saveInsumoHistorial", insumo_id: insumoId });
        successMessage = "✅ Insumo guardado (no se pudo registrar historial de precio)";
      }
    }

    const shouldRecalc = Boolean(
      isUpdate && insumoId && (precioChanged || cantidadChanged || unidadChanged),
    );
    if (shouldRecalc) {
      try {
        const recetasPorId = Object.fromEntries(
          (recetas || []).map((r) => [r.id, r]),
        );

        // 1) Recetas directas que usan el insumo
        const directRecetasAfectadas = (recetaIngredientes || [])
          .filter((ri) => String(ri.insumo_id) === String(insumoId))
          .map((ri) => ri.receta_id)
          .filter(Boolean);

        // 2) BFS transitive: agregar recetas "padre" que dependen vía `receta_id_precursora`
        const padresPorPrecursora = new Map();
        for (const ri of recetaIngredientes || []) {
          if (!ri.receta_id_precursora) continue;
          const precKey = String(ri.receta_id_precursora);
          if (!padresPorPrecursora.has(precKey)) padresPorPrecursora.set(precKey, []);
          padresPorPrecursora.get(precKey).push(ri.receta_id);
        }

        const recetasAfectadasIds = new Set(directRecetasAfectadas.map((id) => String(id)));
        const queue = [...directRecetasAfectadas];
        while (queue.length) {
          const current = queue.shift();
          const padres = padresPorPrecursora.get(String(current)) || [];
          for (const p of padres) {
            if (!p) continue;
            if (!recetasAfectadasIds.has(String(p))) {
              recetasAfectadasIds.add(String(p));
              queue.push(p);
            }
          }
        }

        if (recetasAfectadasIds.size > 0) {
          // Para `costoReceta` necesitamos parchear *precio + presentación + unidad* del insumo.
          const insumosById = Object.fromEntries((insumos || []).map((i) => [i.id, i]));
          const insumosAfter = Object.values(insumosById).map((i) => ({
            ...i,
            precio: String(i.id) === String(insumoId) ? precio : i.precio,
            cantidad_presentacion:
              String(i.id) === String(insumoId)
                ? cantidad_presentacion
                : i.cantidad_presentacion,
            unidad: String(i.id) === String(insumoId) ? form.unidad : i.unidad,
          }));

          let recetasOk = 0;
          const erroresRecetas = [];

          for (const recIdKey of recetasAfectadasIds) {
            const receta = recetasPorId[recIdKey];
            const recId = receta?.id ?? recIdKey;
            const rindeNum = parseDecimal(receta?.rinde) ?? 1;
            const costoDespues = costoReceta(
              recId,
              recetaIngredientes || [],
              insumosAfter,
              recetas || [],
            );
            const costoUnitDespues =
              rindeNum > 0 ? costoDespues / rindeNum : 0;

            try {
              await updateRecetaCostos(recId, {
                costo_lote: costoDespues,
                costo_unitario: costoUnitDespues,
              });
              recetasOk += 1;
            } catch (err) {
              console.error("[insumosLista/updateRecetaCostos]", err);
              erroresRecetas.push(receta?.nombre || recIdKey);
            }
          }

          if (recetasOk > 0) {
            successMessage =
              `✅ Insumo actualizado y costos recalculados en ${recetasOk} receta(s)`;
          }

          if (erroresRecetas.length > 0) {
            showToast(
              `⚠️ No se pudo actualizar costo de: ${erroresRecetas
                .slice(0, 2)
                .join(", ")}${erroresRecetas.length > 2 ? "…" : ""}`,
            );
          }
        }
      } catch (err) {
        console.error("[insumosLista/recalcularCostosRecetas]", err);
        showToast(
          "⚠️ Se actualizó el insumo pero no se pudieron recalcular algunas recetas",
        );
      }
    }
    showToast(successMessage);
    setSaving(false);
    setModal(false);
    onRefresh();
  }, [
    form,
    editando,
    insumos,
    recetas,
    recetaIngredientes,
    updateInsumo,
    insertInsumo,
    insertPrecioHistorial,
    updateRecetaCostos,
    showToast,
    onRefresh,
  ]);

  const guardarMovimiento = useCallback(async () => {
    const cant = parseDecimal(movCantidad);
    if (!movInsumo || !cant || cant <= 0) return;
    setMovSaving(true);
    try {
      await registrarMovimientoInsumo(
        movInsumo.id,
        movTipo,
        cant,
        movTipo === "ajuste_baja"
          ? null
          : movValor
          ? parseDecimal(movValor)
          : null
      );
      showToast(
        movTipo === "ingreso"
          ? `✅ +${cant} ${movInsumo.nombre}`
          : movTipo === "egreso"
          ? `✅ Egreso: -${cant} ${movInsumo.nombre}`
          : `✅ Ajuste aplicado: -${cant} ${movInsumo.nombre}`
      );
      setMovModal(false);
      onRefresh();
    } catch {
      showToast("⚠️ Error al registrar movimiento");
    } finally {
      setMovSaving(false);
    }
  }, [
    movInsumo,
    movTipo,
    movCantidad,
    movValor,
    registrarMovimientoInsumo,
    showToast,
    onRefresh,
  ]);

  return {
    search,
    setSearch,
    catActiva,
    setCatActiva,
    modal,
    setModal,
    editando,
    setEditando,
    form,
    setForm,
    saving,
    movModal,
    setMovModal,
    movInsumo,
    movTipo,
    movCantidad,
    setMovCantidad,
    movValor,
    setMovValor,
    movSaving,
    detalleInsumo,
    setDetalleInsumo,
    filtradosOrdenados,
    openNew,
    openEdit,
    openMov,
    save,
    guardarMovimiento,
    deleteInsumo,
    confirm,
  };
}
