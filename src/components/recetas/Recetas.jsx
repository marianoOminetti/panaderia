import { useState } from "react";
import { fmt, pctFmt } from "../../lib/format";
import { convertirAUnidadInsumo, aGramos } from "../../lib/units";
import { costoReceta } from "../../lib/costos";
import { useRecetas } from "../../hooks/useRecetas";
import SearchableSelect from "../ui/SearchableSelect";

/** Calcula el costo total desde ingredientes del formulario (antes de guardar). Incluye recetas precursoras. */
function costoDesdeIngredientes(ingredientes, insumos, recetas = []) {
  let total = 0;
  for (const ing of ingredientes || []) {
    if (ing.costo_fijo != null && ing.costo_fijo !== "" && parseFloat(ing.costo_fijo) > 0) {
      total += parseFloat(ing.costo_fijo);
      continue;
    }
    if (ing.receta_id_precursora) {
      const prec = recetas.find((r) => r.id === ing.receta_id_precursora);
      const costoUnitPrec = typeof prec?.costo_unitario === "number" && prec.costo_unitario >= 0 ? prec.costo_unitario : 0;
      const cant = parseFloat(ing.cantidad) || 0;
      const u = (ing.unidad || "u").toLowerCase();
      const cantUnidades = u === "u" ? cant : (aGramos(cant, ing.unidad) / (parseFloat(prec?.gramos_por_unidad) || 1));
      total += cantUnidades * costoUnitPrec;
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
  const [form, setForm] = useState({ nombre: "", emoji: "🍞", rinde: "", unidad_rinde: "u", precio_venta: "", es_precursora: false, gramos_por_unidad: "" });
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
    setForm({ nombre: "", emoji: "🍞", rinde: "", unidad_rinde: "u", precio_venta: "", es_precursora: false, gramos_por_unidad: "" });
    setIngredientes([{ insumo_id: "", receta_id_precursora: "", cantidad: "", unidad: "g", costo_fijo: "" }]);
    setModal(true);
  };

  const openEdit = (r) => {
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
      .filter((i) => i.receta_id === r.id)
      .map((i) => ({
        insumo_id: i.insumo_id || "",
        receta_id_precursora: i.receta_id_precursora || "",
        cantidad: i.cantidad != null ? String(i.cantidad) : "",
        unidad: i.unidad || "g",
        costo_fijo: i.costo_fijo != null ? String(i.costo_fijo) : ""
      }));
    setIngredientes(ings.length > 0 ? ings : [{ insumo_id: "", receta_id_precursora: "", cantidad: "", unidad: "g", costo_fijo: "" }]);
    setModal(true);
  };

  const addIng = () => setIngredientes([...ingredientes, { insumo_id: "", receta_id_precursora: "", cantidad: "", unidad: "g", costo_fijo: "" }]);
  const removeIng = (i) => setIngredientes(ingredientes.filter((_, idx) => idx !== i));
  const updateIng = (i, field, val) => setIngredientes(ingredientes.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));

  const copyReceta = async (r) => {
    setSaving(true);
    try {
      const payload = {
        nombre: `Copia de ${(r.nombre || "").trim()}`.toUpperCase(),
        emoji: r.emoji || "🍞",
        rinde: parseFloat(r.rinde) || 1,
        unidad_rinde: r.unidad_rinde || "u",
        precio_venta: parseFloat(r.precio_venta) || 0,
        costo_lote: 0,
        costo_unitario: 0,
        es_precursora: !!r.es_precursora,
        gramos_por_unidad: r.gramos_por_unidad != null && r.gramos_por_unidad > 0 ? parseFloat(r.gramos_por_unidad) : null
      };
      const newReceta = await insertReceta(payload);
      if (!newReceta?.id) {
        showToast("⚠️ No se pudo crear la copia");
        setSaving(false);
        return;
      }
      const ingsOrig = recetaIngredientes.filter((i) => i.receta_id === r.id);
      if (ingsOrig.length > 0) {
        const rows = ingsOrig.map((i) => ({
          receta_id: newReceta.id,
          insumo_id: i.insumo_id || null,
          receta_id_precursora: i.receta_id_precursora || null,
          cantidad: parseFloat(i.cantidad) || 0,
          unidad: i.unidad || "g",
          costo_fijo: i.costo_fijo != null && i.costo_fijo > 0 ? parseFloat(i.costo_fijo) : null
        }));
        await insertRecetaIngredientes(rows);
      }
      onRefresh();
      setForm({
        nombre: newReceta.nombre,
        emoji: newReceta.emoji || "🍞",
        rinde: String(newReceta.rinde || ""),
        unidad_rinde: newReceta.unidad_rinde || "u",
        precio_venta: String(newReceta.precio_venta || ""),
        es_precursora: !!newReceta.es_precursora,
        gramos_por_unidad: newReceta.gramos_por_unidad != null ? String(newReceta.gramos_por_unidad) : ""
      });
      const ingsForm = ingsOrig.length > 0 ? ingsOrig.map((i) => ({
        insumo_id: i.insumo_id || "",
        receta_id_precursora: i.receta_id_precursora || "",
        cantidad: i.cantidad != null ? String(i.cantidad) : "",
        unidad: i.unidad || "g",
        costo_fijo: i.costo_fijo != null ? String(i.costo_fijo) : ""
      })) : [{ insumo_id: "", receta_id_precursora: "", cantidad: "", unidad: "g", costo_fijo: "" }];
      setIngredientes(ingsForm);
      setEditando(newReceta);
      setModal(true);
      showToast("✅ Copia creada. Cambiá el nombre y lo que necesites, luego Guardar.");
    } catch (err) {
      showToast("⚠️ Error al copiar la receta");
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const rindeNum = (() => { const v = parseFloat(form.rinde); return (isNaN(v) || v <= 0) ? 1 : v; })();
    const costoLote = costoDesdeIngredientes(ingredientes, insumos, recetas);
    const costoUnitario = rindeNum > 0 ? costoLote / rindeNum : 0;
    const payload = {
      nombre: (form.nombre || "").trim().toUpperCase(),
      emoji: form.emoji,
      rinde: rindeNum,
      unidad_rinde: form.unidad_rinde,
      precio_venta: parseFloat(form.precio_venta) || 0,
      costo_lote: costoLote,
      costo_unitario: costoUnitario,
      es_precursora: !!form.es_precursora,
      gramos_por_unidad: form.gramos_por_unidad && parseFloat(form.gramos_por_unidad) > 0 ? parseFloat(form.gramos_por_unidad) : null
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
        const ings = ingredientes
          .filter(i => i.insumo_id || i.receta_id_precursora || (i.costo_fijo != null && i.costo_fijo !== "" && parseFloat(i.costo_fijo) > 0))
          .map(i => ({
            receta_id: recId,
            insumo_id: i.receta_id_precursora ? null : (i.insumo_id || null),
            receta_id_precursora: i.receta_id_precursora || null,
            cantidad: parseFloat(i.cantidad) || 0,
            unidad: i.unidad || "g",
            costo_fijo: i.costo_fijo && parseFloat(i.costo_fijo) > 0 ? parseFloat(i.costo_fijo) : null
          }));
        if (ings.length > 0) {
          await insertRecetaIngredientes(ings);
        }
      }
    } catch (err) {
      const msg = err?.message || String(err);
      const esColumna = /column|does not exist|no existe/i.test(msg);
      showToast(esColumna ? "⚠️ Falta migración en la base de datos. Ejecutá las migraciones (es_precursora, receta_ingredientes)." : `⚠️ Error al guardar: ${msg.slice(0, 60)}${msg.length > 60 ? "…" : ""}`);
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
        const costoLoteCalc = costoReceta(r.id, recetaIngredientes, insumos, recetas);
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="receta-nombre">{r.nombre}</div>
                <div className="receta-rinde">Rinde {r.rinde} {r.unidad_rinde}</div>
              </div>
              <button type="button" className="receta-copy-btn" onClick={(e) => { e.stopPropagation(); copyReceta(r); }} title="Copiar receta" disabled={saving}>📋 Copiar</button>
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
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Pan de Molde" style={{ textTransform: "uppercase" }} />
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
              <label htmlFor="receta-es-precursora" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input id="receta-es-precursora" type="checkbox" checked={!!form.es_precursora} onChange={() => setForm({ ...form, es_precursora: !form.es_precursora })} style={{ width: 18, height: 18 }} />
                Es receta precursora (se puede usar como ingrediente de otras recetas)
              </label>
            </div>
            {form.es_precursora && (
              <div className="form-group">
                <label className="form-label">Gramos por unidad (opcional)</label>
                <input className="form-input" type="number" min="0" step="any" placeholder="Ej: 500 si 1 u = 500 g" value={form.gramos_por_unidad} onChange={e => setForm({ ...form, gramos_por_unidad: e.target.value })} />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Para que otras recetas puedan cargar esta precursora en gramos (ej. 45 g de masa sable).</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Ingredientes</label>
              {ingredientes.map((ing, i) => {
                const esPrecursora = !!ing.receta_id_precursora;
                const recetasPrecursoras = recetasOrdenadas.filter(rec => rec.id !== editando?.id && !!rec.es_precursora);
                const valorSelect = ing.receta_id_precursora ? `r:${ing.receta_id_precursora}` : (ing.insumo_id ? `i:${ing.insumo_id}` : "");
                const opcionesCombo = [
                  { value: "", label: "Insumo, receta precursora o costo fijo..." },
                  ...insumosOrdenados.map(ins => ({ value: `i:${ins.id}`, label: ins.nombre })),
                  ...recetasPrecursoras.map(rec => ({ value: `r:${rec.id}`, label: `${rec.emoji || ""} ${rec.nombre}`.trim() })),
                ];
                const onSelectIng = (val) => {
                  if (!val) {
                    setIngredientes(prev => prev.map((item, idx) => idx !== i ? item : { ...item, insumo_id: "", receta_id_precursora: "" }));
                    return;
                  }
                  if (val.startsWith("r:")) {
                    setIngredientes(prev => prev.map((item, idx) => idx !== i ? item : { ...item, receta_id_precursora: val.slice(2), insumo_id: "", unidad: "g" }));
                  } else {
                    setIngredientes(prev => prev.map((item, idx) => idx !== i ? item : { ...item, insumo_id: val.startsWith("i:") ? val.slice(2) : val, receta_id_precursora: "" }));
                  }
                };
                return (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: "2 1 200px", minWidth: 0 }}>
                      <SearchableSelect
                        options={opcionesCombo}
                        value={valorSelect}
                        onChange={onSelectIng}
                        placeholder="Buscar insumo o receta precursora..."
                        emptyMessage="Sin resultados"
                      />
                    </div>
                    {esPrecursora ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 100px", minWidth: 0 }}>
                        <input className="form-input" style={{ flex: "1 1 0", minWidth: 50 }} type="number" step="any" min="0.01" placeholder="Cant." value={ing.cantidad} onChange={e => updateIng(i, "cantidad", e.target.value)} />
                        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>en</span>
                        <select className="form-select" style={{ flexShrink: 0, minWidth: 72, width: "auto" }} value={ing.unidad || "g"} onChange={e => updateIng(i, "unidad", e.target.value)} title="Unidad">
                          {["g", "ml", "u", "kg"].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    ) : ing.insumo_id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 100px", minWidth: 0 }}>
                        <input className="form-input" style={{ flex: "1 1 0", minWidth: 50 }} type="number" step="any" placeholder="Cant." value={ing.cantidad} onChange={e => updateIng(i, "cantidad", e.target.value)} />
                        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>en</span>
                        <select className="form-select" style={{ flexShrink: 0, minWidth: 72, width: "auto" }} value={ing.unidad} onChange={e => updateIng(i, "unidad", e.target.value)} title="Unidad">
                          {["g", "ml", "u", "kg"].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    ) : (
                      <input className="form-input" style={{ flex: "1 1 100px" }} type="number" step="any" placeholder="Costo fijo $" value={ing.costo_fijo} onChange={e => updateIng(i, "costo_fijo", e.target.value)} />
                    )}
                    <button onClick={() => removeIng(i)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#999" }}>✕</button>
                  </div>
                );
              })}
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
            const costoTotal = costoDesdeIngredientes(ingredientes, insumos, recetas);
            const rindeNum = parseFloat(form.rinde) || 0;
            const costoPorUnidad = rindeNum > 0 ? costoTotal / rindeNum : null;
            const precioVenta = parseFloat(form.precio_venta) || 0;
            const margenVal = rindeNum > 0 && precioVenta > 0 && costoPorUnidad != null && costoPorUnidad >= 0
              ? (precioVenta - costoPorUnidad) / precioVenta
              : null;
            const unidadRinde = form.unidad_rinde || "u";
            const showPanel = costoTotal > 0 || ingredientes.some(i => i.insumo_id || i.receta_id_precursora || i.costo_fijo) || precioVenta > 0;
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
