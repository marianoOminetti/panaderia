/**
 * Pantalla Recetas: lista filtrable, modal nueva/editar (useRecetasForm + RecetaModal).
 * useRecetas para persistencia; filterRecetasIds para deep link desde Insumos (recetas afectadas).
 */
import { fmt, pctFmt, parseDecimal } from "../../lib/format";
import { costoReceta, costoDesdeIngredientes } from "../../lib/costos";
import { useRecetas } from "../../hooks/useRecetas";
import { useRecetasForm } from "../../hooks/useRecetasForm";
import RecetaModal from "./RecetaModal";

export default function Recetas({ recetas, insumos, recetaIngredientes, showToast, onRefresh, confirm, filterRecetasIds, onClearFilter }) {
  const {
    updateReceta,
    insertReceta,
    deleteRecetaIngredientes,
    insertRecetaIngredientes,
    deleteReceta,
  } = useRecetas();

  const {
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
    closeModal,
  } = useRecetasForm({ recetaIngredientes });

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
            cantidad: parseDecimal(i.cantidad) ?? 0,
          unidad: i.unidad || "g",
            costo_fijo: (() => {
              const c = parseDecimal(i.costo_fijo);
              return c != null && c > 0 ? c : null;
            })()
        }));
        await insertRecetaIngredientes(rows);
      }
      onRefresh();
      setForm({
        nombre: newReceta.nombre,
        emoji: newReceta.emoji || "🍞",
        rinde: newReceta.rinde != null ? String(newReceta.rinde) : "",
        unidad_rinde: newReceta.unidad_rinde || "u",
        precio_venta: newReceta.precio_venta != null ? String(newReceta.precio_venta) : "",
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
    const rindeNum = (() => {
      const v = parseDecimal(form.rinde);
      return (v == null || v <= 0) ? 1 : v;
    })();
    const costoLote = costoDesdeIngredientes(ingredientes, insumos, recetas);
    const costoUnitario = rindeNum > 0 ? costoLote / rindeNum : 0;
    const payload = {
      nombre: (form.nombre || "").trim().toUpperCase(),
      emoji: form.emoji,
      rinde: rindeNum,
      unidad_rinde: form.unidad_rinde,
      precio_venta: parseDecimal(form.precio_venta) ?? 0,
      costo_lote: costoLote,
      costo_unitario: costoUnitario,
      es_precursora: !!form.es_precursora,
      gramos_por_unidad: (() => {
        const g = parseDecimal(form.gramos_por_unidad);
        return g != null && g > 0 ? g : null;
      })()
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
          .filter(i => {
            if (i.insumo_id || i.receta_id_precursora) return true;
            const c = parseDecimal(i.costo_fijo);
            return c != null && c > 0;
          })
          .map(i => ({
            receta_id: recId,
            insumo_id: i.receta_id_precursora ? null : (i.insumo_id || null),
            receta_id_precursora: i.receta_id_precursora || null,
            cantidad: parseDecimal(i.cantidad) ?? 0,
            unidad: i.unidad || "g",
            costo_fijo: (() => {
              const c = parseDecimal(i.costo_fijo);
              return c != null && c > 0 ? c : null;
            })()
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
    closeModal();
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
      closeModal();
      onRefresh();
    } catch {
      showToast("⚠️ No se pudo eliminar (hay ventas vinculadas)");
    } finally {
      setSaving(false);
    }
  };

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
        <RecetaModal
          editando={editando}
          form={form}
          setForm={setForm}
          ingredientes={ingredientes}
          setIngredientes={setIngredientes}
          addIng={addIng}
          removeIng={removeIng}
          updateIng={updateIng}
          saving={saving}
          closeModal={closeModal}
          onSave={save}
          onEliminar={eliminar}
          recetasOrdenadas={recetasOrdenadas}
          insumosOrdenados={insumosOrdenados}
          recetas={recetas}
          insumos={insumos}
        />
      )}
    </div>
  );
}
