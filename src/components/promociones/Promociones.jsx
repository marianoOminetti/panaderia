/**
 * Administración de promociones: N×M, % en productos, % por monto mínimo.
 */
import { useState, useMemo } from "react";
import { reportError } from "../../utils/errorReport";
import { usePromociones } from "../../hooks/usePromociones";
import {
  TIPOS_PROMO,
  etiquetaPromo,
  promoUsaProductos,
  recetasEnOtrasPromosActivas,
} from "../../lib/promociones";
import { FormInput, FormMoneyInput, FormCheckbox } from "../ui";

const TIPOS_OPCIONES = [
  { value: TIPOS_PROMO.NXM, label: "Llevá N / Pagá M (ej. 5×4)" },
  { value: TIPOS_PROMO.PORCENTAJE_PRODUCTOS, label: "% descuento en productos" },
  { value: TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO, label: "% por monto mínimo de compra" },
];

const emptyForm = () => ({
  nombre: "",
  tipo: TIPOS_PROMO.NXM,
  llevar: "5",
  pagar: "4",
  porcentaje: "20",
  monto_minimo: "50000",
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

  const usaProductos = promoUsaProductos(form.tipo);

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
      tipo: p.tipo || TIPOS_PROMO.NXM,
      llevar: String(p.llevar ?? 5),
      pagar: String(p.pagar ?? 4),
      porcentaje: String(p.porcentaje ?? 20),
      monto_minimo: String(p.monto_minimo ?? 50000),
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
    if (!nombre) {
      showToast("Ingresá un nombre para la promo");
      return;
    }

    const tipo = form.tipo || TIPOS_PROMO.NXM;
    let llevar;
    let pagar;
    let porcentaje;
    let monto_minimo;

    if (tipo === TIPOS_PROMO.NXM) {
      llevar = parseInt(form.llevar, 10);
      pagar = parseInt(form.pagar, 10);
      if (!Number.isFinite(llevar) || !Number.isFinite(pagar) || pagar >= llevar || pagar < 1) {
        showToast("Revisá llevá / pagá (pagá debe ser menor que llevá)");
        return;
      }
      if (!form.receta_ids?.length) {
        showToast("Elegí al menos un producto");
        return;
      }
    } else if (tipo === TIPOS_PROMO.PORCENTAJE_PRODUCTOS) {
      porcentaje = parseFloat(String(form.porcentaje).replace(",", "."));
      if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
        showToast("El porcentaje debe ser entre 1 y 100");
        return;
      }
      if (!form.receta_ids?.length) {
        showToast("Elegí al menos un producto");
        return;
      }
    } else if (tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO) {
      porcentaje = parseFloat(String(form.porcentaje).replace(",", "."));
      monto_minimo = parseFloat(String(form.monto_minimo).replace(",", "."));
      if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
        showToast("El porcentaje debe ser entre 1 y 100");
        return;
      }
      if (!Number.isFinite(monto_minimo) || monto_minimo <= 0) {
        showToast("Ingresá un monto mínimo mayor a 0");
        return;
      }
    }

    if (usaProductos) {
      const conflicto = form.receta_ids.find((rid) => bloqueadas.has(rid));
      if (conflicto) {
        const r = recetas.find((x) => x.id === conflicto);
        showToast(`"${r?.nombre || "Producto"}" ya está en otra promo activa`);
        return;
      }
    }

    setSaving(true);
    try {
      await savePromocion({
        id: editId,
        nombre,
        tipo,
        llevar,
        pagar,
        porcentaje,
        monto_minimo,
        activa: form.activa,
        receta_ids: usaProductos ? form.receta_ids : [],
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
    if (p.activa === false && promoUsaProductos(p.tipo)) {
      const bloqueadasToggle = recetasEnOtrasPromosActivas(promociones, p.id);
      const conflicto = (p.receta_ids || []).find((rid) => bloqueadasToggle.has(rid));
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
      <p className="page-subtitle">
        Reglas automáticas al cobrar: 5×4, % en productos o % por monto mínimo
      </p>

      <button type="button" className="btn-primary" style={{ marginBottom: 16 }} onClick={abrirNueva}>
        + Nueva promo
      </button>

      {lista.length === 0 ? (
        <div className="card">
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            No hay promos configuradas. Creá una y definí cómo se aplica el descuento.
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
                  background:
                    p.activa !== false ? "rgba(74, 124, 89, 0.15)" : "var(--border)",
                  color: p.activa !== false ? "var(--green)" : "var(--text-muted)",
                  fontWeight: p.activa !== false ? 600 : 400,
                }}
              >
                {p.activa !== false ? "Activa" : "Inactiva"}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
              {etiquetaPromo(p)}
              {promoUsaProductos(p.tipo) &&
                ` · ${(p.receta_ids || []).length} producto${(p.receta_ids || []).length === 1 ? "" : "s"}`}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn-secondary btn-sm" onClick={() => abrirEditar(p)}>
                Editar
              </button>
              <button
                type="button"
                className={p.activa !== false ? "btn-danger" : "btn-secondary"}
                style={{ width: "auto", marginTop: 0, padding: "8px 14px", fontSize: 13 }}
                onClick={() => toggleConValidacion(p)}
              >
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
                placeholder="Ej: 20% en medialunas"
              />
              <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                Tipo de promo
              </label>
              <select
                className="form-input"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                style={{ marginBottom: 12 }}
              >
                {TIPOS_OPCIONES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {form.tipo === TIPOS_PROMO.NXM && (
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
              )}

              {(form.tipo === TIPOS_PROMO.PORCENTAJE_PRODUCTOS ||
                form.tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO) && (
                <FormInput
                  label="Porcentaje de descuento"
                  value={form.porcentaje}
                  onChange={(v) => setForm((f) => ({ ...f, porcentaje: v }))}
                  inputMode="decimal"
                  placeholder="Ej: 20"
                />
              )}

              {form.tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO && (
                <FormMoneyInput
                  label="Monto mínimo de compra"
                  value={form.monto_minimo}
                  onChange={(v) => setForm((f) => ({ ...f, monto_minimo: v }))}
                  placeholder="50000"
                />
              )}

              <FormCheckbox
                label="Promo activa"
                checked={form.activa}
                onChange={(v) => setForm((f) => ({ ...f, activa: v }))}
              />
            </div>

            {usaProductos && (
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
            )}

            {form.tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO && (
              <p className="form-hint" style={{ marginBottom: 16 }}>
                El descuento aplica sobre el total del carrito cuando supera el monto mínimo (todos
                los productos cuentan).
              </p>
            )}

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
