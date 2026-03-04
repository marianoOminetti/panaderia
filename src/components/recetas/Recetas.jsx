import { useState } from "react";
import { fmt, pctFmt } from "../../lib/format";
import { convertirAUnidadInsumo } from "../../lib/units";
import { costoReceta } from "../../lib/costos";
import { useRecetas } from "../../hooks/useRecetas";

/** Calcula el costo total desde ingredientes del formulario (antes de guardar) */
function costoDesdeIngredientes(ingredientes, insumos) {
  let total = 0;
  for (const ing of ingredientes || []) {
    if (ing.costo_fijo != null && ing.costo_fijo !== "" && parseFloat(ing.costo_fijo) > 0) {
      total += parseFloat(ing.costo_fijo);
      continue;
    }
    if (!ing.insumo_id) continue;
    const insumo = insumos.find((x) => x.id === ing.insumo_id);
    if (!insumo || !insumo.cantidad_presentacion) continue;
    const cant = parseFloat(ing.cantidad) || 0;
    if (cant <= 0) continue;
    const cantConvertida = convertirAUnidadInsumo(cant, ing.unidad || "g", insumo.unidad);
    const precioUnitario = insumo.precio / insumo.cantidad_presentacion;
    total += precioUnitario * cantConvertida;
  }
  return total;
}
export default function Recetas({ recetas, insumos, recetaIngredientes, showToast, onRefresh, confirm, filterRecetasIds, onClearFilter }) {
  const {
    updateReceta,
    insertReceta,
    deleteRecetaIngredientes,
    insertRecetaIngredientes,
    deleteReceta,
  } = useRecetas();

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", emoji: "🍞", rinde: "", unidad_rinde: "u", precio_venta: "" });
  const [ingredientes, setIngredientes] = useState([]);

  const aplicaFiltro = Array.isArray(filterRecetasIds) && filterRecetasIds.length > 0;
  const recetasFuente = aplicaFiltro
    ? recetas.filter((r) => filterRecetasIds.includes(r.id))
    : recetas;

  const recetasOrdenadas = [...recetasFuente].slice().sort((a, b) =>
    (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })
  );
  const insumosOrdenados = [...insumos].slice().sort((a, b) =>
    (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })
  );

  const openNew = () => {
    setEditando(null);
    setForm({ nombre: "", emoji: "🍞", rinde: "", unidad_rinde: "u", precio_venta: "" });
    setIngredientes([{ insumo_id: "", cantidad: "", unidad: "g", costo_fijo: "" }]);
    setModal(true);
  };

  const openEdit = (r) => {
    setEditando(r);
    setForm({
      nombre: r.nombre,
      emoji: r.emoji || "🍞",
      rinde: String(r.rinde || ""),
      unidad_rinde: r.unidad_rinde || "u",
      precio_venta: String(r.precio_venta || "")
    });
    const ings = recetaIngredientes
      .filter((i) => i.receta_id === r.id)
      .map((i) => ({
        insumo_id: i.insumo_id || "",
        cantidad: i.cantidad ? String(i.cantidad) : "",
        unidad: i.unidad || "g",
        costo_fijo: i.costo_fijo != null ? String(i.costo_fijo) : ""
      }));
    setIngredientes(ings.length > 0 ? ings : [{ insumo_id: "", cantidad: "", unidad: "g", costo_fijo: "" }]);
    setModal(true);
  };

  const addIng = () => setIngredientes([...ingredientes, { insumo_id: "", cantidad: "", unidad: "g", costo_fijo: "" }]);
  const removeIng = (i) => setIngredientes(ingredientes.filter((_, idx) => idx !== i));
  const updateIng = (i, field, val) => setIngredientes(ingredientes.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));

  const save = async () => {
    setSaving(true);
    const rindeNum = (() => { const v = parseFloat(form.rinde); return (isNaN(v) || v <= 0) ? 1 : v; })();
    const costoLote = costoDesdeIngredientes(ingredientes, insumos);
    const costoUnitario = rindeNum > 0 ? costoLote / rindeNum : 0;
    const payload = {
      nombre: form.nombre,
      emoji: form.emoji,
      rinde: rindeNum,
      unidad_rinde: form.unidad_rinde,
      precio_venta: parseFloat(form.precio_venta) || 0,
      costo_lote: costoLote,
      costo_unitario: costoUnitario
    };
    let recId = editando?.id;

    try {
      if (editando) {
        await updateReceta(editando.id, payload);
        await deleteRecetaIngredientes(editando.id);
      } else {
        const rec = await insertReceta(payload);
        recId = rec?.id ?? recId;
      }

      if (recId) {
        const ings = ingredientes.filter(i => i.insumo_id || i.costo_fijo).map(i => ({
          receta_id: recId,
          insumo_id: i.insumo_id || null,
          cantidad: parseFloat(i.cantidad) || 0,
          unidad: i.unidad,
          costo_fijo: i.costo_fijo ? parseFloat(i.costo_fijo) : null
        }));
        if (ings.length > 0) {
          await insertRecetaIngredientes(ings);
        }
      }
    } catch (err) {
      showToast("⚠️ Error al guardar");
      setSaving(false);
      return;
    }
    showToast(editando ? "✅ Receta actualizada" : "✅ Receta guardada");
    setSaving(false);
    setModal(false);
    setEditando(null);
    onRefresh();
  };

  const eliminar = async () => {
    if (!editando) return;
    if (!(await confirm(`¿Eliminar la receta "${editando.nombre}"?`, { destructive: true }))) return;
    setSaving(true);
    try {
      await deleteRecetaIngredientes(editando.id);
      await deleteReceta(editando.id);
      showToast("🗑️ Receta eliminada");
    } catch {
      showToast("⚠️ No se pudo eliminar (hay ventas vinculadas)");
    } finally {
      setSaving(false);
      setModal(false);
      setEditando(null);
      onRefresh();
    }
  };

  const EMOJIS = ["🍞", "🥐", "🍕", "🍫", "🍪", "🥧", "🍰", "🧁", "🫔", "🥬", "🍗", "🍔", "🎂", "🧇", "🥨"];

  return (
    <div className="content">
      <p className="page-title">Recetas</p>
      <p className="page-subtitle">
        {recetasFuente.length} recetas cargadas
        {aplicaFiltro && " · filtradas por últimas actualizaciones"}
      </p>
      {aplicaFiltro && onClearFilter && (
        <button
          type="button"
          className="btn-secondary"
          onClick={onClearFilter}
          style={{ marginBottom: 12 }}
        >
          Ver todas las recetas
        </button>
      )}

      {recetas.length === 0 ? (
        <div className="empty"><div className="empty-icon">📋</div><p>No hay recetas todavía.<br />Tocá + para agregar.</p></div>
      ) : recetasOrdenadas.map(r => {
        const rindeNum = parseFloat(r.rinde) || 1;
        const costoLoteCalc = costoReceta(r.id, recetaIngredientes, insumos);
        const costoUnitarioCalc = rindeNum > 0 ? costoLoteCalc / rindeNum : null;
        // Si en DB está 0 o no definido, usar el calculado desde ingredientes (evita margen 100% falso)
        const costoUnitario = (typeof r.costo_unitario === "number" && r.costo_unitario > 0)
          ? r.costo_unitario
          : costoUnitarioCalc;
        const margenVal = rindeNum > 0 && r.precio_venta > 0 && costoUnitario != null
          ? (r.precio_venta - costoUnitario) / r.precio_venta
          : null;
        const margen = margenVal != null ? pctFmt(margenVal) : "—";
        const margenNegativo = margenVal != null && margenVal < 0;
        const tieneIngredientes = recetaIngredientes.some((i) => i.receta_id === r.id);
        return (
          <div key={r.id} className="receta-card" onClick={() => openEdit(r)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && openEdit(r)}>
            <div className="receta-top">
              <span className="receta-emoji">{r.emoji}</span>
              <div>
                <div className="receta-nombre">{r.nombre}</div>
                <div className="receta-rinde">Rinde {r.rinde} {r.unidad_rinde}</div>
              </div>
            </div>
            <div className="receta-stats">
              <div className="receta-stat">
                <div className="receta-stat-label">Precio venta</div>
                <div className="receta-stat-value">{fmt(r.precio_venta || 0)}/{(r.unidad_rinde || "u").replace("porción", "porc.")}</div>
              </div>
              <div className="receta-stat">
                <div className="receta-stat-label">Costo/u</div>
                <div className="receta-stat-value">{tieneIngredientes && costoUnitario != null ? fmt(costoUnitario) : "—"}</div>
              </div>
              <div className="receta-stat">
                <div className="receta-stat-label">Margen</div>
                <div className={`receta-stat-value ${margenNegativo ? "rojo" : margenVal != null ? "verde" : ""}`}>{margen}</div>
              </div>
            </div>
          </div>
        );
      })}

      <button className="fab fab-receta" onClick={openNew} title="Nueva receta">
        <span>+</span>
        <span>Nueva receta</span>
      </button>

      {modal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => { setModal(false); setEditando(null); }}>← Volver</button>
            <span className="screen-title">{editando ? "Editar receta" : "Nueva receta"}</span>
          </div>
          <div className="screen-content">
            <div className="form-group">
              <label className="form-label">Emoji</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm({ ...form, emoji: e })}
                    style={{ fontSize: 20, background: form.emoji === e ? "var(--purple-dark)" : "var(--cream)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: form.emoji === e ? "white" : "inherit" }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Pan de Molde" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Rinde (unidades que salen)</label>
                <input className="form-input" type="number" min="0.01" step="0.01" value={form.rinde} onChange={e => setForm({ ...form, rinde: e.target.value })} placeholder="4" />
              </div>
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select className="form-select" value={form.unidad_rinde} onChange={e => setForm({ ...form, unidad_rinde: e.target.value })}>
                  {["u", "kg", "porción", "pack"].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Precio de venta por {form.unidad_rinde || "u"} ($)</label>
              <input className="form-input" type="number" value={form.precio_venta} onChange={e => setForm({ ...form, precio_venta: e.target.value })} placeholder="6000" />
            </div>

            <div className="form-group">
              <label className="form-label">Ingredientes</label>
              {ingredientes.map((ing, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select className="form-select" style={{ flex: "2 1 120px" }} value={ing.insumo_id} onChange={e => updateIng(i, "insumo_id", e.target.value)}>
                    <option value="">Insumo o costo fijo...</option>
                    {insumosOrdenados.map(ins => <option key={ins.id} value={ins.id}>{ins.nombre}</option>)}
                  </select>
                  {ing.insumo_id ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "1 1 100px" }}>
                        <input className="form-input" style={{ flex: 1, minWidth: 50 }} type="number" step="any" placeholder="Cant." value={ing.cantidad} onChange={e => updateIng(i, "cantidad", e.target.value)} />
                        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>en</span>
                        <select className="form-select" style={{ flex: "0 0 56px" }} value={ing.unidad} onChange={e => updateIng(i, "unidad", e.target.value)} title="Unidad">
                          {["g", "ml", "u", "kg"].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <input className="form-input" style={{ flex: "1 1 100px" }} type="number" step="any" placeholder="Costo fijo $" value={ing.costo_fijo} onChange={e => updateIng(i, "costo_fijo", e.target.value)} />
                  )}
                  <button onClick={() => removeIng(i)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#999" }}>✕</button>
                </div>
              ))}
              <button onClick={addIng} style={{ background: "none", border: "1px dashed #C8A97E", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#6B3F1F", cursor: "pointer", width: "100%", marginTop: 4 }}>
                + Agregar ingrediente
              </button>
            </div>

            <button className="btn-primary" onClick={save} disabled={saving || !form.nombre || !form.rinde}>
              {saving ? "Guardando..." : editando ? "Guardar cambios" : "Guardar receta"}
            </button>
            {editando && (
              <button className="btn-danger" onClick={eliminar} disabled={saving}>
                Eliminar receta
              </button>
            )}
            <button className="btn-secondary" onClick={() => { setModal(false); setEditando(null); }}>Cancelar</button>
          </div>
          {(() => {
            const costoTotal = costoDesdeIngredientes(ingredientes, insumos);
            const rindeNum = parseFloat(form.rinde) || 0;
            const costoPorUnidad = rindeNum > 0 ? costoTotal / rindeNum : null;
            const precioVenta = parseFloat(form.precio_venta) || 0;
            const margenVal = rindeNum > 0 && precioVenta > 0 && costoPorUnidad != null && costoPorUnidad >= 0
              ? (precioVenta - costoPorUnidad) / precioVenta
              : null;
            const unidadRinde = form.unidad_rinde || "u";
            const showPanel = costoTotal > 0 || ingredientes.some(i => i.insumo_id || i.costo_fijo) || precioVenta > 0;
            if (!showPanel) return null;
            let margenClass = "";
            if (margenVal != null) {
              if (margenVal < 0.4) margenClass = "rojo";
              else if (margenVal <= 0.6) margenClass = "yellow";
              else margenClass = "green";
            }
            const margenText = margenVal != null ? pctFmt(margenVal) : "—";
            return (
              <div className="receta-cost-panel" style={{ borderTop: "1px solid var(--border)", padding: "10px 16px 14px", background: "var(--surface)" }}>
                <div className="stats-row" style={{ marginBottom: 0 }}>
                  <div className="stat-card">
                    <div className="stat-label">Costo total lote</div>
                    <div className="stat-value">{fmt(costoTotal)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Costo por {unidadRinde}</div>
                    <div className="stat-value accent">{rindeNum > 0 ? fmt(costoPorUnidad) : "—"}</div>
                  </div>
                  <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
                    <div className="stat-label">Margen</div>
                    <div className={`stat-value ${margenClass}`}>{margenText}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
