import { useState, useCallback } from "react";

const INITIAL_FORM = {
  nombre: "",
  emoji: "🍞",
  rinde: "",
  unidad_rinde: "u",
  precio_venta: "",
  es_precursora: false,
  gramos_por_unidad: ""
};

const INITIAL_ING = {
  insumo_id: "",
  receta_id_precursora: "",
  cantidad: "",
  unidad: "g",
  costo_fijo: ""
};

/**
 * Estado y handlers del formulario de receta (modal nueva/editar e ingredientes).
 * save, copyReceta y eliminar quedan en el componente (usan useRecetas, showToast, confirm, etc.).
 */
export function useRecetasForm({ recetaIngredientes = [] }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [ingredientes, setIngredientes] = useState([]);

  const openNew = useCallback(() => {
    setEditando(null);
    setForm(INITIAL_FORM);
    setIngredientes([{ ...INITIAL_ING }]);
    setModal(true);
  }, []);

  const openEdit = useCallback((r) => {
    setEditando(r);
    setForm({
      nombre: r.nombre,
      emoji: r.emoji || "🍞",
      rinde: String(r.rinde || ""),
      unidad_rinde: r.unidad_rinde || "u",
      precio_venta: String(r.precio_venta || ""),
      es_precursora: !!r.es_precursora,
      gramos_por_unidad: r.gramos_por_unidad != null ? String(r.gramos_por_unidad) : ""
    });
    const ings = recetaIngredientes
      .filter((i) => String(i.receta_id) === String(r.id))
      .map((i) => ({
        insumo_id: i.insumo_id || "",
        receta_id_precursora: i.receta_id_precursora || "",
        cantidad: i.cantidad != null ? String(i.cantidad) : "",
        unidad: i.unidad || "g",
        costo_fijo: i.costo_fijo != null ? String(i.costo_fijo) : ""
      }));
    setIngredientes(ings.length > 0 ? ings : [{ ...INITIAL_ING }]);
    setModal(true);
  }, [recetaIngredientes]);

  const addIng = useCallback(() => {
    setIngredientes((prev) => [...prev, { ...INITIAL_ING }]);
  }, []);

  const removeIng = useCallback((i) => {
    setIngredientes((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const updateIng = useCallback((i, field, val) => {
    setIngredientes((prev) =>
      prev.map((ing, idx) => (idx === i ? { ...ing, [field]: val } : ing))
    );
  }, []);

  const closeModal = useCallback(() => {
    setModal(false);
    setEditando(null);
  }, []);

  return {
    modal,
    setModal,
    editando,
    setEditando,
    saving,
    setSaving,
    form,
    setForm,
    ingredientes,
    setIngredientes,
    openNew,
    openEdit,
    addIng,
    removeIng,
    updateIng,
    closeModal
  };
}
