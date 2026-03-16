import { useState, useCallback } from "react";
import { reportError } from "../utils/errorReport";

const INITIAL_FORM = {
  nombre: "",
  monto: "",
  tipo: "fijo",
  frecuencia: "mensual",
  fecha: "",
  fechaInicioVigencia: "",
  fechaFinVigencia: "",
};

/**
 * Estado y handlers del formulario de gasto (modal alta/edición).
 * Soporta tipo fijo, variable y puntual.
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
      tipo: g.tipo || "fijo",
      frecuencia: g.frecuencia || "mensual",
      fecha: g.fecha ? String(g.fecha).slice(0, 10) : "",
      fechaInicioVigencia: g.fecha_inicio_vigencia
        ? String(g.fecha_inicio_vigencia).slice(0, 10)
        : "",
      fechaFinVigencia: g.fecha_fin_vigencia
        ? String(g.fecha_fin_vigencia).slice(0, 10)
        : "",
    });
    setModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setModal(false);
    setEditando(null);
  }, []);

  const save = useCallback(async () => {
    if (saving) return;
    if (!form.nombre.trim()) {
      showToast("⚠️ Nombre requerido");
      return;
    }
    const monto = parseFloat(String(form.monto).replace(",", "."));
    if (!monto || monto <= 0) {
      showToast("⚠️ Monto inválido");
      return;
    }
    const tipo = (form.tipo || "fijo").toLowerCase();
    if (tipo === "fijo") {
      const freq = (form.frecuencia || "").toLowerCase();
      if (!["diario", "semanal", "mensual"].includes(freq)) {
        showToast("⚠️ Frecuencia requerida para gasto fijo");
        return;
      }
      const inicioStr = (form.fechaInicioVigencia || "").trim();
      if (!inicioStr) {
        showToast("⚠️ Fecha de inicio requerida para gasto fijo");
        return;
      }
      const inicio = new Date(inicioStr);
      if (Number.isNaN(inicio.getTime())) {
        showToast("⚠️ Fecha de inicio inválida");
        return;
      }
      const finStr = (form.fechaFinVigencia || "").trim();
      if (finStr) {
        const fin = new Date(finStr);
        if (Number.isNaN(fin.getTime())) {
          showToast("⚠️ Fecha de fin inválida");
          return;
        }
        if (fin.getTime() < inicio.getTime()) {
          showToast("⚠️ La fecha de fin no puede ser anterior a la de inicio");
          return;
        }
      }
    } else if (tipo === "variable" || tipo === "puntual") {
      const fechaStr = (form.fecha || "").trim();
      if (!fechaStr) {
        showToast("⚠️ Fecha requerida para gasto variable/puntual");
        return;
      }
      const d = new Date(fechaStr);
      if (Number.isNaN(d.getTime())) {
        showToast("⚠️ Fecha inválida");
        return;
      }
    }

    setSaving(true);
    let payload;
    if (tipo === "fijo") {
      payload = {
        nombre: form.nombre.trim(),
        monto,
        frecuencia: form.frecuencia,
        tipo: "fijo",
        fecha: null,
        fecha_inicio_vigencia: form.fechaInicioVigencia.trim().slice(0, 10),
        fecha_fin_vigencia: form.fechaFinVigencia
          ? form.fechaFinVigencia.trim().slice(0, 10)
          : null,
      };
    } else {
      payload = {
        nombre: form.nombre.trim(),
        monto,
        fecha: form.fecha.trim().slice(0, 10),
        tipo,
        frecuencia: null,
        fecha_inicio_vigencia: null,
        fecha_fin_vigencia: null,
      };
    }
    try {
      await saveGastoFijo(payload, editando?.id);
      closeModal();
    } catch (err) {
      reportError(err, { action: "saveGastoFijo" });
      showToast("⚠️ Error al guardar gasto");
    } finally {
      setSaving(false);
    }
  }, [form, editando, saving, showToast, saveGastoFijo, closeModal]);

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
