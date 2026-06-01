/**
 * Administración de promociones vigentes (llevá N / pagá M).
 */
import { useState, useMemo } from "react";
import { reportError } from "../../utils/errorReport";
import { usePromociones } from "../../hooks/usePromociones";
import {
  etiquetaPromoNxm,
  recetasEnOtrasPromosActivas,
} from "../../lib/promociones";
import { FormInput, FormCheckbox } from "../ui";

const emptyForm = () => ({
  nombre: "",
  llevar: "5",
  pagar: "4",
  activa: true,
  receta_ids: [],
});

export default function Promociones({ promociones, recetas, onRefresh, showToast, confirm }) {
  const { savePromocion, toggleActiva, deletePromocion } = usePromociones({
    onRefresh,
    showToast,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [searchRecetas, setSearchRecetas] = useState("");
  const [saving, setSaving] = useState(false);

  const abrirNueva = () => {
    setEditId(null);
    setForm(emptyForm());
    setSearchRecetas("");
    setModalOpen(true);
  };

  const abrirEditar = (p) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre || "",
      llevar: String(p.llevar ?? 5),
      pagar: String(p.pagar ?? 4),
      activa: p.activa !== false,
      receta_ids: [...(p.receta_ids || [])],
    });
    setSearchRecetas("");
    setModalOpen(true);
  };

  const bloqueadas = useMemo(
    () => recetasEnOtrasPromosActivas(promociones, editId),
    [promociones, editId],
  );

  const recetasFiltradas = useMemo(() => {
    const q = searchRecetas.trim().toLowerCase();
    return [...(recetas || [])]
      .filter((r) => !q || (r.nombre || "").toLowerCase().includes(q))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
  }, [recetas, searchRecetas]);

  const toggleReceta = (recetaId) => {
    setForm((prev) => {
      const ids = prev.receta_ids || [];
      if (ids.includes(recetaId)) {
        return { ...prev, receta_ids: ids.filter((id) => id !== recetaId) };
      }
      return { ...prev, receta_ids: [...ids, recetaId] };
    });
  };

  const guardar = async () => {
    const nombre = form.nombre.trim();
    const llevar = parseInt(form.llevar, 10);
    const pagar = parseInt(form.pagar, 10);
    if (!nombre) {
      showToast("Ingresá un nombre para la promo");
      return;
    }
    if (!Number.isFinite(llevar) || !Number.isFinite(pagar) || pagar >= llevar || pagar < 1) {
      showToast("Revisá llevá / pagá (pagá debe ser menor que llevá)");
      return;
    }
    if (!form.receta_ids?.length) {
      showToast("Elegí al menos un producto");
      return;
    }
    const conflicto = form.receta_ids.find((rid) => bloqueadas.has(rid));
    if (conflicto) {
      const r = recetas.find((x) => x.id === conflicto);
      showToast(`"${r?.nombre || "Producto"}" ya está en otra promo activa`);
      return;
    }
    setSaving(true);
    try {
      await savePromocion({
        id: editId,
        nombre,
        tipo: "nxm",
        llevar,
        pagar,
        activa: form.activa,
        receta_ids: form.receta_ids,
      });
      setModalOpen(false);
    } catch (err) {
      reportError(err, { action: "savePromocion", id: editId });
      showToast("⚠️ Error al guardar promo");
    } finally {
      setSaving(false);
    }
  };

  const toggleConValidacion = async (p) => {
    if (p.activa === false) {
      const conflicto = (p.receta_ids || []).find((rid) => bloqueadas.has(rid));
      if (conflicto) {
        const r = recetas.find((x) => x.id === conflicto);
        showToast(
          `No se puede activar: "${r?.nombre || "producto"}" ya está en otra promo activa`,
        );
        return;
      }
    }
    try {
      await toggleActiva(p);
    } catch (err) {
      reportError(err, { action: "toggleActiva", id: p.id });
      showToast("⚠️ Error al cambiar estado");
    }
  };

  const eliminar = async (p) => {
    const ok = await confirm?.(`¿Eliminar la promo "${p.nombre}"?`, { destructive: true });
    if (!ok) return;
    try {
      await deletePromocion(p);
    } catch (err) {
      reportError(err, { action: "deletePromocion", id: p.id });
      showToast("⚠️ Error al eliminar");
    }
  };

  const lista = [...(promociones || [])].sort((a, b) =>
    (a.nombre || "").localeCompare(b.nombre || "", "es"),
  );

  return (
    <div className="content">
      <p className="page-title">Promociones</p>
      <p className="page-subtitle">Reglas automáticas al cobrar (ej. llevá 5 pagá 4)</p>

      <button type="button" className="btn-primary" style={{ marginBottom: 16 }} onClick={abrirNueva}>
        + Nueva promo
      </button>

      {lista.length === 0 ? (
        <div className="card">
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            No hay promos configuradas. Creá una y elegí los productos que participan.
          </p>
        </div>
      ) : (
        lista.map((p) => (
          <div key={p.id} className="card" style={{ marginBottom: 12 }}>
            <div className="card-header">
              <span className="card-title">{p.nombre}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 8,
                  background: p.activa !== false ? "var(--accent-soft)" : "var(--border)",
                  color: p.activa !== false ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {p.activa !== false ? "Activa" : "Inactiva"}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
              {etiquetaPromoNxm(p)} · {(p.receta_ids || []).length} producto
              {(p.receta_ids || []).length === 1 ? "" : "s"}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn-secondary btn-sm" onClick={() => abrirEditar(p)}>
                Editar
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => toggleConValidacion(p)}>
                {p.activa !== false ? "Desactivar" : "Activar"}
              </button>
              <button type="button" className="btn-remove btn-sm" onClick={() => eliminar(p)}>
                Eliminar
              </button>
            </div>
          </div>
        ))
      )}

      {modalOpen && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button type="button" className="screen-back" onClick={() => setModalOpen(false)}>
              ← Volver
            </button>
            <span className="screen-title">{editId ? "Editar promo" : "Nueva promo"}</span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <FormInput
                label="Nombre"
                value={form.nombre}
                onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}
                placeholder="Ej: Promo medialunas"
              />
              <div style={{ display: "flex", gap: 12 }}>
                <FormInput
                  label="Llevá"
                  value={form.llevar}
                  onChange={(v) => setForm((f) => ({ ...f, llevar: v }))}
                  inputMode="numeric"
                />
                <FormInput
                  label="Pagá"
                  value={form.pagar}
                  onChange={(v) => setForm((f) => ({ ...f, pagar: v }))}
                  inputMode="numeric"
                />
              </div>
              <FormCheckbox
                label="Promo activa"
                checked={form.activa}
                onChange={(v) => setForm((f) => ({ ...f, activa: v }))}
              />
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Productos incluidos</span>
              </div>
              <FormInput
                label="Buscar"
                value={searchRecetas}
                onChange={setSearchRecetas}
                placeholder="Nombre del producto"
              />
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {recetasFiltradas.map((r) => {
                  const checked = form.receta_ids.includes(r.id);
                  const disabled = !checked && bloqueadas.has(r.id);
                  return (
                    <label
                      key={r.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                        opacity: disabled ? 0.5 : 1,
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => !disabled && toggleReceta(r.id)}
                      />
                      <span>
                        {r.emoji || "🍞"} {r.nombre}
                      </span>
                      {disabled && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          (otra promo)
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={guardar}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 8 }}
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
