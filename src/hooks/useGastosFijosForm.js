import { useState, useCallback } from "react";
import { reportError } from "../utils/errorReport";

const INITIAL_FORM = {
  nombre: "",
  monto: "",
  frecuencia: "mensual",
  activo: true,
};

/**
 * Estado y handlers del formulario de gasto fijo (modal alta/edición).
 * Usado por GastosFijos.jsx. La persistencia (saveGastoFijo) se recibe desde el componente.
 * @param {{ showToast: Function, saveGastoFijo: Function }}
 * @returns {{ modal, setModal, editando, form, setForm, saving, openNew, openEdit, save, closeModal }}
 */
export function useGastosFijosForm({ showToast, saveGastoFijo }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const openNew = useCallback(() => {
    setEditando(null);
    setForm(INITIAL_FORM);
    setModal(true);
  }, []);

  const openEdit = useCallback((g) => {
    setEditando(g);
    setForm({
      nombre: g.nombre,
      monto: String(g.monto ?? ""),
      frecuencia: g.frecuencia || "mensual",
      activo: g.activo !== false,
    });
    setModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setModal(false);
    setEditando(null);
  }, []);

  const save = useCallback(async () => {
    if (!form.nombre.trim()) {
      showToast("⚠️ Nombre requerido");
      return;
    }
    const monto = parseFloat(String(form.monto).replace(",", "."));
    if (!monto || monto <= 0) {
      showToast("⚠️ Monto inválido");
      return;
    }
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      monto,
      frecuencia: form.frecuencia,
      activo: form.activo,
    };
    try {
      await saveGastoFijo(payload, editando?.id);
      closeModal();
    } catch (err) {
      reportError(err, { action: "saveGastoFijo" });
      showToast("⚠️ Error al guardar gasto fijo");
    } finally {
      setSaving(false);
    }
  }, [form, editando, showToast, saveGastoFijo, closeModal]);

  return {
    modal,
    setModal,
    editando,
    form,
    setForm,
    saving,
    openNew,
    openEdit,
    save,
    closeModal,
  };
}
