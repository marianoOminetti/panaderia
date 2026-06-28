/**
 * Pantalla Recetas: tabs Masas/Productos, familias, búsqueda y asistentes de masa.
 */
import { useState, useMemo, useCallback } from "react";
import { pctFmt, parseDecimal } from "../../lib/format";
import { costoReceta, costoDesdeIngredientes } from "../../lib/costos";
import { costosParaRecetaYCadena } from "../../lib/recetaCostoCascade";
import { runOptimisticAction } from "../../lib/runOptimisticAction";
import { useRecetas } from "../../hooks/useRecetas";
import { useRecetasForm } from "../../hooks/useRecetasForm";
import { useFilterBySearch } from "../../hooks/useFilterBySearch";
import {
  getTipoReceta,
  TIPO_RECETA,
  collectFamilias,
  groupProductosPorFamilia,
} from "../../lib/recetaTipo";
import ProductSearchInput from "../ui/ProductSearchInput";
import RecetaModal from "./RecetaModal";
import RecetasCard from "./RecetasCard";

const TAB_TODAS = "todas";
const TAB_MASAS = "masas";
const TAB_PRODUCTOS = "productos";

export default function Recetas({
  recetas,
  insumos,
  recetaIngredientes,
  showToast,
  onRefresh,
  appendReceta,
  updateRecetaInState,
  removeReceta,
  replaceRecetaIngredientes,
  confirm,
  filterRecetasIds,
  onClearFilter,
  patchRecetasCosts,
}) {
  const recetaIngredientesSafe = useMemo(
    () => (Array.isArray(recetaIngredientes) ? recetaIngredientes : []),
    [recetaIngredientes],
  );
  const insumosSafe = useMemo(
    () => (Array.isArray(insumos) ? insumos : []),
    [insumos],
  );
  const recetasSafe = useMemo(
    () => (Array.isArray(recetas) ? recetas : []),
    [recetas],
  );
  const filterSet =
    Array.isArray(filterRecetasIds) && filterRecetasIds.length > 0
      ? new Set(filterRecetasIds.map((id) => String(id)))
      : null;

  const [tab, setTab] = useState(TAB_TODAS);
  const [masaSeccion, setMasaSeccion] = useState("todas");
  const [pendingExtraerMasa, setPendingExtraerMasa] = useState(null);

  const {
    updateReceta,
    insertReceta,
    deleteRecetaIngredientes,
    insertRecetaIngredientes,
    deleteReceta,
  } = useRecetas();

  const {
    modal,
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
    setTipoReceta,
  } = useRecetasForm({ recetaIngredientes: recetaIngredientesSafe });

  const aplicaFiltro = Array.isArray(filterRecetasIds) && filterRecetasIds.length > 0;
  const recetasFuente = aplicaFiltro
    ? recetasSafe.filter((r) => filterSet.has(String(r.id)))
    : recetasSafe;

  const recetasOrdenadas = useMemo(
    () =>
      [...recetasFuente].sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }),
      ),
    [recetasFuente],
  );

  const insumosOrdenados = useMemo(
    () =>
      [...insumosSafe].sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }),
      ),
    [insumosSafe],
  );

  const familiasExistentes = useMemo(() => collectFamilias(recetasSafe), [recetasSafe]);

  const tabFiltered = useMemo(() => {
    if (tab === TAB_MASAS) return recetasOrdenadas.filter((r) => r.es_precursora);
    if (tab === TAB_PRODUCTOS) return recetasOrdenadas.filter((r) => !r.es_precursora);
    return recetasOrdenadas;
  }, [recetasOrdenadas, tab]);

  const { search, setSearch, filteredItems } = useFilterBySearch(tabFiltered, "nombre");

  const masasFiltradas = useMemo(() => {
    const masas = filteredItems.filter((r) => r.es_precursora);
    if (masaSeccion === "base") {
      return masas.filter((r) => getTipoReceta(r, recetaIngredientesSafe) === TIPO_RECETA.MASA_BASE);
    }
    if (masaSeccion === "porcionadas") {
      return masas.filter((r) => getTipoReceta(r, recetaIngredientesSafe) === TIPO_RECETA.MASA_PORCIONADA);
    }
    return masas;
  }, [filteredItems, masaSeccion, recetaIngredientesSafe]);

  const productosFiltrados = useMemo(
    () => filteredItems.filter((r) => !r.es_precursora),
    [filteredItems],
  );

  const gruposProductos = useMemo(
    () => groupProductosPorFamilia(productosFiltrados),
    [productosFiltrados],
  );

  const recetasMargenBajo = recetasFuente.filter((r) => {
    if (r.es_precursora) return false;
    const rindeNum = parseDecimal(r.rinde) ?? 1;
    const costoLoteCalc = costoReceta(r.id, recetaIngredientesSafe, insumosSafe, recetasSafe);
    const costoUnitarioCalc = rindeNum > 0 ? costoLoteCalc / rindeNum : null;
    const tieneIngredientes = recetaIngredientesSafe.some((i) => String(i.receta_id) === String(r.id));
    if (!tieneIngredientes) return false;
    const precio = parseDecimal(r.precio_venta) ?? 0;
    if (precio <= 0 || costoUnitarioCalc == null || !isFinite(costoUnitarioCalc) || costoUnitarioCalc <= 0) {
      return false;
    }
    return (precio - costoUnitarioCalc) / precio < 0.5;
  });

  const buildIngredientRows = (recId, ingsSource) =>
    ingsSource
      .filter((i) => {
        if (i.insumo_id || i.receta_id_precursora) return true;
        const c = parseDecimal(i.costo_fijo);
        return c != null && c > 0;
      })
      .map((i) => ({
        receta_id: recId,
        insumo_id: i.receta_id_precursora ? null : i.insumo_id || null,
        receta_id_precursora: i.receta_id_precursora || null,
        cantidad: parseDecimal(i.cantidad) ?? 0,
        unidad: i.unidad || "g",
        costo_fijo: (() => {
          const c = parseDecimal(i.costo_fijo);
          return c != null && c > 0 ? c : null;
        })(),
      }));

  const buildPayload = useCallback(
    (ingsOverride, recetasOverride, recetaIngredientesOverride) => {
      const ings = ingsOverride ?? ingredientes;
      const recetasList = recetasOverride ?? recetasSafe;
      const riList = recetaIngredientesOverride ?? recetaIngredientesSafe;
      const rindeNum = (() => {
        const v = parseDecimal(form.rinde);
        return v == null || v <= 0 ? 1 : v;
      })();
      const costoLote = costoDesdeIngredientes(ings, insumosSafe, recetasList, riList);
      const costoUnitario = rindeNum > 0 ? costoLote / rindeNum : 0;
      return {
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
        })(),
        oculto_en_venta: !!form.oculto_en_venta,
        familia: (form.familia || "").trim() || null,
      };
    },
    [form, ingredientes, insumosSafe, recetasSafe, recetaIngredientesSafe],
  );

  const copyReceta = async (r) => {
    const payload = {
      nombre: `Copia de ${(r.nombre || "").trim()}`.toUpperCase(),
      emoji: r.emoji || "🍞",
      rinde: parseDecimal(r.rinde) ?? 1,
      unidad_rinde: r.unidad_rinde || "u",
      precio_venta: parseDecimal(r.precio_venta) ?? 0,
      costo_lote: 0,
      costo_unitario: 0,
      es_precursora: !!r.es_precursora,
      gramos_por_unidad:
        r.gramos_por_unidad != null && r.gramos_por_unidad > 0
          ? parseDecimal(r.gramos_por_unidad)
          : null,
      oculto_en_venta: !!r.oculto_en_venta,
      familia: r.familia || null,
    };
    const ingsOrig = recetaIngredientesSafe.filter((i) => String(i.receta_id) === String(r.id));
    const pendingId = `pending-receta-${Date.now()}`;
    const pendingReceta = { ...payload, id: pendingId };
    const pendingIngs = ingsOrig.map((i) => ({
      receta_id: pendingId,
      insumo_id: i.insumo_id || null,
      receta_id_precursora: i.receta_id_precursora || null,
      cantidad: parseDecimal(i.cantidad) ?? 0,
      unidad: i.unidad || "g",
      costo_fijo: (() => {
        const c = parseDecimal(i.costo_fijo);
        return c != null && c > 0 ? c : null;
      })(),
    }));

    showToast("Copiando receta…");
    try {
      await runOptimisticAction({
        optimistic: () => {
          appendReceta?.(pendingReceta);
          if (pendingIngs.length) replaceRecetaIngredientes?.(pendingId, pendingIngs);
        },
        persist: async () => {
          const newReceta = await insertReceta(payload);
          if (!newReceta?.id) throw new Error("No se pudo crear la copia");
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
              })(),
            }));
            await insertRecetaIngredientes(rows);
            replaceRecetaIngredientes?.(newReceta.id, rows);
          }
          removeReceta?.(pendingId);
          appendReceta?.(newReceta);
          return newReceta;
        },
        rollback: () => {
          removeReceta?.(pendingId);
          onRefresh?.();
        },
        showToast,
        errorMessage: "⚠️ Error al copiar la receta",
      }).then((newReceta) => {
        if (!newReceta) return;
        openEdit(newReceta);
        showToast("✅ Copia creada. Cambiá el nombre y lo que necesites, luego Guardar.");
      });
    } catch {
      // toast ya mostrado
    }
  };

  const save = async () => {
    let recId = editando?.id;
    const isUpdate = Boolean(editando?.id);
    const pendingId = isUpdate ? recId : `pending-receta-${Date.now()}`;
    let ingsToSave = ingredientes;
    let pendingMasaPayload = null;

    if (pendingExtraerMasa) {
      pendingMasaPayload = pendingExtraerMasa;
      ingsToSave = pendingExtraerMasa.productoIngredientes.map((i) =>
        i.receta_id_precursora === "__PENDING_MASA__"
          ? {
              ...i,
              cantidad: String(
                pendingExtraerMasa.gramosMasaPorUnidadProducto || i.cantidad,
              ),
            }
          : i,
      );
    }

    closeModal();
    setPendingExtraerMasa(null);
    try {
      await runOptimisticAction({
        optimistic: () => {
          const payloadPreview = buildPayload(ingsToSave);
          const optimisticReceta = { ...payloadPreview, id: pendingId };
          if (isUpdate) updateRecetaInState?.(optimisticReceta);
          else appendReceta?.(optimisticReceta);
          replaceRecetaIngredientes?.(pendingId, buildIngredientRows(pendingId, ingsToSave));
        },
        persist: async () => {
          let finalId = recId;
          let recetasPersist = [...recetasSafe];
          let riPersist = [...recetaIngredientesSafe];
          let masaRec = null;

          if (pendingMasaPayload) {
            const { masaPayload, masaIngredientes, gramosMasaPorUnidadProducto } = pendingMasaPayload;
            const costoLoteMasa = costoDesdeIngredientes(
              masaIngredientes,
              insumosSafe,
              recetasPersist,
              riPersist,
            );
            masaRec = await insertReceta({
              ...masaPayload,
              costo_lote: costoLoteMasa,
              costo_unitario: costoLoteMasa,
            });
            if (!masaRec?.id) throw new Error("No se pudo crear la masa");
            const masaRows = buildIngredientRows(masaRec.id, masaIngredientes);
            if (masaRows.length) await insertRecetaIngredientes(masaRows);
            appendReceta?.(masaRec);
            replaceRecetaIngredientes?.(masaRec.id, masaRows);
            recetasPersist = [...recetasPersist, masaRec];
            riPersist = [...riPersist, ...masaRows];
            ingsToSave = ingsToSave.map((i) =>
              i.receta_id_precursora === "__PENDING_MASA__"
                ? {
                    ...i,
                    receta_id_precursora: masaRec.id,
                    cantidad: String(gramosMasaPorUnidadProducto || i.cantidad),
                  }
                : i,
            );
          }

          const payload = buildPayload(ingsToSave, recetasPersist, riPersist);

          if (isUpdate) {
            await updateReceta(editando.id, payload);
            await deleteRecetaIngredientes(editando.id);
            finalId = editando.id;
          } else {
            const rec = await insertReceta(payload);
            finalId = rec?.id;
            if (!finalId) throw new Error("No se pudo crear la receta");
            removeReceta?.(pendingId);
            appendReceta?.({ ...payload, id: finalId });
          }

          if (finalId) {
            const ings = buildIngredientRows(finalId, ingsToSave);
            if (ings.length > 0) await insertRecetaIngredientes(ings);
            replaceRecetaIngredientes?.(finalId, ings);
            riPersist = [
              ...riPersist.filter((ri) => String(ri.receta_id) !== String(finalId)),
              ...ings,
            ];
            const idxRec = recetasPersist.findIndex((r) => String(r.id) === String(finalId));
            const recetaGuardada = { ...payload, id: finalId };
            if (idxRec >= 0) recetasPersist[idxRec] = recetaGuardada;
            else recetasPersist.push(recetaGuardada);

            const cascadeId = pendingMasaPayload ? masaRec?.id : finalId;
            const costUpdates = costosParaRecetaYCadena(
              cascadeId,
              recetasPersist,
              riPersist,
              insumosSafe,
            );
            for (const cu of costUpdates) {
              if (String(cu.id) === String(finalId) && !pendingMasaPayload) continue;
              await updateReceta(cu.id, {
                costo_lote: cu.costo_lote,
                costo_unitario: cu.costo_unitario,
              });
            }
            if (costUpdates.length > 0) {
              patchRecetasCosts?.(costUpdates);
            }
          }
        },
        rollback: () => onRefresh?.(),
        showToast,
        pendingMessage: isUpdate ? "Guardando cambios…" : "Guardando receta…",
        successMessage: isUpdate ? "✅ Receta actualizada" : "✅ Receta guardada",
        errorMessage: "⚠️ Error al guardar",
        onError: (err) => {
          const msg = err?.message || String(err);
          if (/column|does not exist|no existe/i.test(msg)) {
            showToast("⚠️ Falta migración en la base de datos. Ejecutá las migraciones (familia, es_precursora).");
          }
        },
      });
    } catch {
      // toast ya mostrado
    }
  };

  const eliminar = async () => {
    if (!editando) return;
    if (!(await confirm(`¿Eliminar la receta "${editando.nombre}"?`, { destructive: true }))) return;
    const recId = editando.id;
    closeModal();
    try {
      await runOptimisticAction({
        optimistic: () => removeReceta?.(recId),
        persist: async () => {
          await deleteRecetaIngredientes(recId);
          await deleteReceta(recId);
        },
        rollback: () => onRefresh?.(),
        showToast,
        pendingMessage: "Eliminando…",
        successMessage: "🗑️ Receta eliminada",
        errorMessage: "⚠️ No se pudo eliminar (hay ventas vinculadas)",
      });
    } catch {
      // toast ya mostrado
    }
  };

  const handleExtraerMasa = (result) => {
    const prodIngs = result.productoIngredientes.map((i) =>
      i.receta_id_precursora === "__PENDING_MASA__"
        ? {
            ...i,
            cantidad: String(result.gramosMasaPorUnidadProducto || i.cantidad),
          }
        : i,
    );
    setPendingExtraerMasa(result);
    setIngredientes(prodIngs);
    setForm((prev) => ({
      ...prev,
      familia: result.masaPayload.familia || prev.familia,
      tipo_receta: TIPO_RECETA.PRODUCTO,
      es_precursora: false,
    }));
    showToast("Masa lista para crear al guardar el producto.");
  };

  const handleCreatePorciones = async (payloads) => {
    if (!payloads?.length) return;
    setSaving(true);
    let creadas = 0;
    try {
      for (const p of payloads) {
        const { ingredientes: ings, ...payload } = p;
        const costoLote = costoDesdeIngredientes(ings, insumosSafe, recetasSafe, recetaIngredientesSafe);
        const rec = await insertReceta({ ...payload, costo_lote: costoLote, costo_unitario: costoLote });
        if (!rec?.id) throw new Error(`No se pudo crear ${payload.nombre}`);
        const rows = buildIngredientRows(rec.id, ings);
        if (rows.length) await insertRecetaIngredientes(rows);
        appendReceta?.(rec);
        replaceRecetaIngredientes?.(rec.id, rows);
        creadas += 1;
      }
      showToast(`✅ ${creadas} porción(es) creada(s)`);
      onRefresh?.();
    } catch {
      showToast(
        creadas > 0
          ? `⚠️ Solo se crearon ${creadas} de ${payloads.length} porciones`
          : "⚠️ Error al crear porciones",
      );
      if (creadas > 0) onRefresh?.();
    } finally {
      setSaving(false);
    }
  };

  const handleNuevaVariante = ({ form: varianteForm, ingredientes: varianteIngs }) => {
    setEditando(null);
    setForm({
      ...varianteForm,
      nombre: varianteForm.nombre.toUpperCase(),
      tipo_receta: TIPO_RECETA.PRODUCTO,
    });
    setIngredientes(varianteIngs.length ? varianteIngs : [{ insumo_id: "", receta_id_precursora: "", cantidad: "", unidad: "g", costo_fijo: "" }]);
    showToast("Variante lista en el formulario. Revisá nombre y precio, luego Guardar.");
  };

  const renderCards = (list) =>
    list.map((r) => (
      <RecetasCard
        key={r.id}
        receta={r}
        recetaIngredientes={recetaIngredientesSafe}
        insumos={insumosSafe}
        recetas={recetasSafe}
        onEdit={openEdit}
        onCopy={copyReceta}
        saving={saving}
      />
    ));

  return (
    <div className="content">
      <p className="page-title">Recetas</p>
      <p className="page-subtitle">
        {recetasFuente.length} recetas cargadas
        {aplicaFiltro && " · filtradas por últimas actualizaciones"}
      </p>

      {aplicaFiltro && onClearFilter && (
        <button type="button" className="btn-secondary" onClick={onClearFilter} style={{ marginBottom: 12 }}>
          Ver todas las recetas
        </button>
      )}

      <div className="plan-picker-tabs recetas-tabs">
        <button type="button" className={`plan-picker-tab ${tab === TAB_TODAS ? "active" : ""}`} onClick={() => setTab(TAB_TODAS)}>
          Todas
        </button>
        <button type="button" className={`plan-picker-tab ${tab === TAB_MASAS ? "active" : ""}`} onClick={() => setTab(TAB_MASAS)}>
          Masas
        </button>
        <button type="button" className={`plan-picker-tab ${tab === TAB_PRODUCTOS ? "active" : ""}`} onClick={() => setTab(TAB_PRODUCTOS)}>
          Productos
        </button>
      </div>

      <ProductSearchInput value={search} onChange={setSearch} placeholder="Buscar receta…" />

      {recetasMargenBajo.length > 0 && (
        <div className="card dashboard-alert" style={{ marginTop: 12, marginBottom: 12 }}>
          <div className="card-header">
            <span className="card-title">⚠️ Margen bajo</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {recetasMargenBajo.slice(0, 6).map((r) => {
              const rindeNum = parseDecimal(r.rinde) ?? 1;
              const costoLoteCalc = costoReceta(r.id, recetaIngredientesSafe, insumosSafe, recetasSafe);
              const costoUnitarioCalc = rindeNum > 0 ? costoLoteCalc / rindeNum : null;
              const precio = parseDecimal(r.precio_venta) ?? 0;
              const margenVal =
                precio > 0 && costoUnitarioCalc != null && costoUnitarioCalc > 0
                  ? (precio - costoUnitarioCalc) / precio
                  : null;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openEdit(r)}
                  className="receta-margen-chip"
                >
                  {r.emoji || "🍞"} {r.nombre} · {margenVal != null ? pctFmt(margenVal) : "—"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {recetasFuente.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <p>
            No hay recetas todavía.
            <br />
            Tocá + para agregar.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <p className="plan-dia-card-empty" style={{ marginTop: 16 }}>
          Sin resultados para «{search}»
        </p>
      ) : (
        <>
          {(tab === TAB_MASAS || tab === TAB_TODAS) && masasFiltradas.length > 0 && (
            <div className="recetas-grupo">
              {tab === TAB_MASAS && (
                <div className="plan-picker-tabs recetas-masa-subtabs">
                  <button type="button" className={`plan-picker-tab ${masaSeccion === "todas" ? "active" : ""}`} onClick={() => setMasaSeccion("todas")}>
                    Todas
                  </button>
                  <button type="button" className={`plan-picker-tab ${masaSeccion === "base" ? "active" : ""}`} onClick={() => setMasaSeccion("base")}>
                    Base
                  </button>
                  <button type="button" className={`plan-picker-tab ${masaSeccion === "porcionadas" ? "active" : ""}`} onClick={() => setMasaSeccion("porcionadas")}>
                    Porcionadas
                  </button>
                </div>
              )}
              {tab === TAB_TODAS && <p className="recetas-grupo-title">Masas</p>}
              {renderCards(masasFiltradas)}
            </div>
          )}

          {(tab === TAB_PRODUCTOS || tab === TAB_TODAS) &&
            gruposProductos.map(({ familia, items }) =>
              items.length ? (
                <div key={familia || "__sin__"} className="recetas-grupo">
                  <p className="recetas-grupo-title">
                    {tab === TAB_TODAS ? `Productos · ${familia || "Sin familia"}` : familia || "Sin familia"}
                  </p>
                  {renderCards(items)}
                </div>
              ) : null,
            )}
        </>
      )}

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
          closeModal={() => {
            setPendingExtraerMasa(null);
            closeModal();
          }}
          onSave={save}
          onEliminar={eliminar}
          setTipoReceta={setTipoReceta}
          recetasOrdenadas={recetasOrdenadas}
          insumosOrdenados={insumosOrdenados}
          recetas={recetasSafe}
          insumos={insumosSafe}
          recetaIngredientes={recetaIngredientesSafe}
          familiasExistentes={familiasExistentes}
          onExtraerMasa={handleExtraerMasa}
          onCreatePorciones={handleCreatePorciones}
          onNuevaVariante={handleNuevaVariante}
        />
      )}
    </div>
  );
}
