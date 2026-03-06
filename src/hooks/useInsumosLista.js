import { useState, useCallback, useMemo } from "react";
import { reportError } from "../utils/errorReport";

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
  updateInsumo,
  insertInsumo,
  insertPrecioHistorial,
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
    const precio = parseFloat(form.precio);
    const cantidad_presentacion =
      parseFloat(form.cantidad_presentacion) || 0;
    if (Number.isNaN(precio) || precio <= 0) {
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
          : Number(editando.precio) || 0
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
    let successMessage = isUpdate ? "✅ Precio actualizado" : "✅ Insumo agregado";
    if (
      isUpdate &&
      precioAnterior != null &&
      Math.abs(precio - precioAnterior) >= 0.01
    ) {
      const insumoId = editando.id;
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
    showToast(successMessage);
    setSaving(false);
    setModal(false);
    onRefresh();
  }, [
    form,
    editando,
    updateInsumo,
    insertInsumo,
    insertPrecioHistorial,
    showToast,
    onRefresh,
  ]);

  const guardarMovimiento = useCallback(async () => {
    const cant = parseFloat(movCantidad);
    if (!movInsumo || !cant || cant <= 0) return;
    setMovSaving(true);
    try {
      await registrarMovimientoInsumo(
        movInsumo.id,
        movTipo,
        cant,
        movValor ? parseFloat(movValor) : null
      );
      showToast(
        movTipo === "ingreso"
          ? `✅ +${cant} ${movInsumo.nombre}`
          : `✅ Egreso: -${cant} ${movInsumo.nombre}`
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
