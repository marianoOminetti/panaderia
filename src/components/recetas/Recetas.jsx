/**
 * Pantalla Recetas: lista filtrable, modal nueva/editar (useRecetasForm + RecetaModal).
 */
import { useMemo, useState, useCallback } from "react";
import { parseDecimal } from "../../lib/format";
import { costoReceta, costoDesdeIngredientes } from "../../lib/costos";
import { runOptimisticAction } from "../../lib/runOptimisticAction";
import { useRecetas } from "../../hooks/useRecetas";
import { useRecetasForm } from "../../hooks/useRecetasForm";
import { costosParaRecetaYCadena } from "../../lib/recetaCostoCascade";
import { collectFamilias, groupProductosPorFamilia } from "../../lib/recetaFamilia";
import { normalizeNombreUpper, normalizeNombreUpperOrNull } from "../../lib/normalizeNombre";
import {
  FILTRO_OCULTAS,
  FILTRO_TIPO,
  filtrarRecetas,
  recetasParaRevisar,
} from "../../lib/recetaLista";
import RecetaModal from "./RecetaModal";
import RecetaCard from "./RecetaCard";
import RecetasAlertasBar from "./RecetasAlertasBar";

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
  patchRecetasCosts,
  confirm,
  filterRecetasIds,
  onClearFilter,
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

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState(FILTRO_TIPO.TODAS);
  const [filtroOcultas, setFiltroOcultas] = useState(FILTRO_OCULTAS.TODAS);
  const [filtroAlerta, setFiltroAlerta] = useState(null);
  const [togglingOcultoId, setTogglingOcultoId] = useState(null);
  const [togglingPrecursoraId, setTogglingPrecursoraId] = useState(null);
  const [familiasSesion, setFamiliasSesion] = useState([]);

  const registrarFamilia = useCallback((f) => {
    const n = normalizeNombreUpper(f);
    if (!n) return;
    setFamiliasSesion((prev) => {
      if (prev.includes(n)) return prev;
      return [...prev, n].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    });
  }, []);

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
  } = useRecetasForm({ recetaIngredientes: recetaIngredientesSafe });

  const aplicaFiltroInsumos = Array.isArray(filterRecetasIds) && filterRecetasIds.length > 0;
  const recetasBase = aplicaFiltroInsumos
    ? recetasSafe.filter((r) => filterSet.has(String(r.id)))
    : recetasSafe;

  const recetasConProblemas = useMemo(
    () =>
      recetasParaRevisar(
        recetasBase,
        recetaIngredientesSafe,
        insumosSafe,
        recetasSafe,
      ),
    [recetasBase, recetaIngredientesSafe, insumosSafe, recetasSafe],
  );

  const problemasPorRecetaId = useMemo(() => {
    const map = new Map();
    for (const { receta, problemas } of recetasConProblemas) {
      map.set(String(receta.id), problemas);
    }
    return map;
  }, [recetasConProblemas]);

  const recetasMargenBajo = useMemo(
    () =>
      recetasBase.filter((r) => {
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
      }),
    [recetasBase, recetaIngredientesSafe, insumosSafe, recetasSafe],
  );

  const margenBajoIds = useMemo(
    () => new Set(recetasMargenBajo.map((r) => String(r.id))),
    [recetasMargenBajo],
  );

  const recetasFiltradas = useMemo(() => {
    let list = filtrarRecetas(recetasBase, { busqueda, tipo: filtroTipo, ocultas: filtroOcultas });
    if (filtroAlerta === "problemas") {
      list = list.filter((r) => problemasPorRecetaId.has(String(r.id)));
    } else if (filtroAlerta === "margen") {
      list = list.filter((r) => margenBajoIds.has(String(r.id)));
    }
    return list;
  }, [recetasBase, busqueda, filtroTipo, filtroOcultas, filtroAlerta, problemasPorRecetaId, margenBajoIds]);

  const familiasExistentes = useMemo(() => {
    const set = new Set([...collectFamilias(recetasSafe), ...familiasSesion]);
    return [...set].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [recetasSafe, familiasSesion]);

  const recetasOrdenadas = useMemo(
    () =>
      [...recetasFiltradas].sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }),
      ),
    [recetasFiltradas],
  );

  const masasFiltradas = useMemo(
    () => recetasOrdenadas.filter((r) => !!r.es_precursora),
    [recetasOrdenadas],
  );

  const productosFiltrados = useMemo(
    () => recetasOrdenadas.filter((r) => !r.es_precursora),
    [recetasOrdenadas],
  );

  const gruposProductos = useMemo(
    () => groupProductosPorFamilia(productosFiltrados),
    [productosFiltrados],
  );

  const masasCatalogo = useMemo(
    () =>
      [...recetasSafe]
        .filter((r) => !!r.es_precursora)
        .sort((a, b) =>
          (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }),
        ),
    [recetasSafe],
  );

  const insumosOrdenados = useMemo(
    () =>
      [...insumosSafe].sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }),
      ),
    [insumosSafe],
  );

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

  const buildPayloadFromForm = (ingsOverride) => {
    const rindeNum = (() => {
      const v = parseDecimal(form.rinde);
      return v == null || v <= 0 ? 1 : v;
    })();
    const ings = ingsOverride ?? ingredientes;
    const costoLote = costoDesdeIngredientes(ings, insumosSafe, recetasSafe, recetaIngredientesSafe);
    const costoUnitario = rindeNum > 0 ? costoLote / rindeNum : 0;
    return {
      nombre: normalizeNombreUpper(form.nombre),
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
      familia: normalizeNombreUpperOrNull(form.familia),
    };
  };

  const openCopiaEnModal = (newReceta, ingsOrig) => {
    setForm({
      nombre: newReceta.nombre,
      emoji: newReceta.emoji || "🍞",
      rinde: newReceta.rinde != null ? String(newReceta.rinde) : "",
      unidad_rinde: newReceta.unidad_rinde || "u",
      precio_venta: newReceta.precio_venta != null ? String(newReceta.precio_venta) : "",
      es_precursora: !!newReceta.es_precursora,
      gramos_por_unidad:
        newReceta.gramos_por_unidad != null ? String(newReceta.gramos_por_unidad) : "",
      oculto_en_venta: !!newReceta.oculto_en_venta,
      familia: newReceta.familia || "",
    });
    const ingsForm =
      ingsOrig.length > 0
        ? ingsOrig.map((i) => ({
            insumo_id: i.insumo_id || "",
            receta_id_precursora: i.receta_id_precursora || "",
            cantidad: i.cantidad != null ? String(i.cantidad) : "",
            unidad: i.unidad || "g",
            costo_fijo: i.costo_fijo != null ? String(i.costo_fijo) : "",
          }))
        : [{ insumo_id: "", receta_id_precursora: "", cantidad: "", unidad: "g", costo_fijo: "" }];
    setIngredientes(ingsForm);
    setEditando(newReceta);
    setModal(true);
  };

  const persistCopia = async (r, { nombreOverride, toastOk }) => {
    const ingsOrig = recetaIngredientesSafe.filter((i) => String(i.receta_id) === String(r.id));
    const ingsForm = ingsOrig.map((i) => ({
      insumo_id: i.insumo_id || "",
      receta_id_precursora: i.receta_id_precursora || "",
      cantidad: i.cantidad != null ? String(i.cantidad) : "",
      unidad: i.unidad || "g",
      costo_fijo: i.costo_fijo != null ? String(i.costo_fijo) : "",
    }));
    const rindeNum = parseDecimal(r.rinde) ?? 1;
    const costoLote = costoDesdeIngredientes(ingsForm, insumosSafe, recetasSafe, recetaIngredientesSafe);
    const costoUnitario = rindeNum > 0 ? costoLote / rindeNum : 0;
    const payload = {
      nombre: normalizeNombreUpper(nombreOverride || `Copia de ${r.nombre || ""}`),
      emoji: r.emoji || "🍞",
      rinde: rindeNum,
      unidad_rinde: r.unidad_rinde || "u",
      precio_venta: parseDecimal(r.precio_venta) ?? 0,
      costo_lote: costoLote,
      costo_unitario: costoUnitario,
      es_precursora: !!r.es_precursora,
      gramos_por_unidad:
        r.gramos_por_unidad != null && r.gramos_por_unidad > 0
          ? parseDecimal(r.gramos_por_unidad)
          : null,
      oculto_en_venta: !!r.oculto_en_venta,
      familia: normalizeNombreUpperOrNull(r.familia),
    };
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
          let recetasPersist = [...recetasSafe, { ...payload, id: newReceta.id }];
          let riPersist = [...recetaIngredientesSafe];
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
            riPersist = [...riPersist, ...rows];
          }
          const costUpdates = costosParaRecetaYCadena(
            newReceta.id,
            recetasPersist,
            riPersist,
            insumosSafe,
          );
          for (const cu of costUpdates) {
            await updateReceta(cu.id, {
              costo_lote: cu.costo_lote,
              costo_unitario: cu.costo_unitario,
            });
          }
          if (costUpdates.length > 0) {
            patchRecetasCosts?.(costUpdates);
          }
          const cuSelf = costUpdates.find((c) => String(c.id) === String(newReceta.id));
          const recetaFinal = {
            ...newReceta,
            ...payload,
            costo_lote: cuSelf?.costo_lote ?? payload.costo_lote,
            costo_unitario: cuSelf?.costo_unitario ?? payload.costo_unitario,
          };
          removeReceta?.(pendingId);
          appendReceta?.(recetaFinal);
          return recetaFinal;
        },
        rollback: () => {
          removeReceta?.(pendingId);
          onRefresh?.();
        },
        showToast,
        errorMessage: "⚠️ Error al copiar la receta",
      }).then((newReceta) => {
        if (!newReceta) return;
        openCopiaEnModal(newReceta, ingsOrig);
        showToast(toastOk);
      });
    } catch {
      // toast ya mostrado
    }
  };

  const copyReceta = (r) => persistCopia(r, { toastOk: "✅ Copia creada. Cambiá el nombre y lo que necesites." });

  const togglePrecursora = async (r) => {
    const next = !r.es_precursora;

    if (next) {
      if (
        !(await confirm(
          `¿Marcar «${r.nombre}» como receta precursora?\n\nPodrás usarla como ingrediente (masa) en otras recetas. Para ocultarla en ventas, usá el botón Ocultar.`,
        ))
      ) {
        return;
      }
    } else {
      const hijas = recetaIngredientesSafe.filter(
        (i) => String(i.receta_id_precursora) === String(r.id),
      );
      if (hijas.length > 0) {
        const nombres = [
          ...new Set(
            hijas.map((i) => {
              const rec = recetasSafe.find((x) => String(x.id) === String(i.receta_id));
              return (rec?.nombre || "otra receta").trim();
            }),
          ),
        ].slice(0, 4);
        const extra = hijas.length > 4 ? ` (+${hijas.length - 4} más)` : "";
        if (
          !(await confirm(
            `«${r.nombre}» la usan: ${nombres.join(", ")}${extra}.\n\n¿Quitar precursora igual? Esas recetas seguirán enlazadas pero no aparecerá en el selector de masas.`,
          ))
        ) {
          return;
        }
      } else if (!(await confirm(`¿Quitar precursora de «${r.nombre}»?`))) {
        return;
      }
    }

    setTogglingPrecursoraId(r.id);
    const payload = { es_precursora: next };
    try {
      await runOptimisticAction({
        optimistic: () => updateRecetaInState?.({ ...r, ...payload }),
        persist: async () => {
          await updateReceta(r.id, payload);
        },
        rollback: () => onRefresh?.(),
        showToast,
        pendingMessage: next ? "Marcando precursora…" : "Quitando precursora…",
        successMessage: next ? "🍞 Marcada como precursora" : "✓ Ya no es precursora",
        errorMessage: "⚠️ No se pudo actualizar",
      });
    } catch {
      // toast ya mostrado
    } finally {
      setTogglingPrecursoraId(null);
    }
  };

  const toggleOcultoEnVenta = async (r) => {
    const next = !r.oculto_en_venta;
    setTogglingOcultoId(r.id);
    try {
      await runOptimisticAction({
        optimistic: () => updateRecetaInState?.({ ...r, oculto_en_venta: next }),
        persist: async () => {
          await updateReceta(r.id, { oculto_en_venta: next });
        },
        rollback: () => onRefresh?.(),
        showToast,
        pendingMessage: next ? "Ocultando…" : "Mostrando en venta…",
        successMessage: next ? "👁‍🗨 Oculta en venta" : "👁 Visible en venta",
        errorMessage: "⚠️ No se pudo actualizar",
      });
    } catch {
      // toast ya mostrado
    } finally {
      setTogglingOcultoId(null);
    }
  };

  const save = async () => {
    const payload = buildPayloadFromForm();
    const isUpdate = Boolean(editando?.id);
    const pendingId = isUpdate ? editando.id : `pending-receta-${Date.now()}`;
    const ingsRows = buildIngredientRows(pendingId, ingredientes);
    const optimisticReceta = { ...payload, id: pendingId };

    closeModal();
    try {
      await runOptimisticAction({
        optimistic: () => {
          if (isUpdate) {
            updateRecetaInState?.(optimisticReceta);
          } else {
            appendReceta?.(optimisticReceta);
          }
          replaceRecetaIngredientes?.(pendingId, ingsRows);
        },
        persist: async () => {
          let finalId = editando?.id;
          let recetasPersist = [...recetasSafe];
          let riPersist = [...recetaIngredientesSafe];

          if (isUpdate) {
            await updateReceta(editando.id, payload);
            await deleteRecetaIngredientes(editando.id);
            finalId = editando.id;
          } else {
            const rec = await insertReceta(payload);
            finalId = rec?.id;
            if (!finalId) throw new Error("No se pudo crear la receta");
            removeReceta?.(pendingId);
            appendReceta?.({ ...payload, ...rec, id: finalId });
          }

          if (payload.familia) registrarFamilia(payload.familia);

          if (finalId) {
            const ings = buildIngredientRows(finalId, ingredientes);
            if (ings.length > 0) {
              await insertRecetaIngredientes(ings);
            }
            replaceRecetaIngredientes?.(finalId, ings);
            riPersist = [
              ...riPersist.filter((ri) => String(ri.receta_id) !== String(finalId)),
              ...ings,
            ];
            const idxRec = recetasPersist.findIndex((rec) => String(rec.id) === String(finalId));
            const recetaGuardada = { ...payload, id: finalId };
            if (idxRec >= 0) recetasPersist[idxRec] = recetaGuardada;
            else recetasPersist.push(recetaGuardada);

            const costUpdates = costosParaRecetaYCadena(
              finalId,
              recetasPersist,
              riPersist,
              insumosSafe,
            );
            for (const cu of costUpdates) {
              if (String(cu.id) === String(finalId)) continue;
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
            showToast(
              "⚠️ Falta migración en la base de datos. Ejecutá las migraciones (familia, es_precursora).",
            );
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

  const renderCard = (r) => (
    <RecetaCard
      key={r.id}
      receta={r}
      recetaIngredientes={recetaIngredientesSafe}
      insumos={insumosSafe}
      recetas={recetasSafe}
      problemas={problemasPorRecetaId.get(String(r.id)) || []}
      onEdit={openEdit}
      onCopy={copyReceta}
      onTogglePrecursora={togglePrecursora}
      onToggleOculto={toggleOcultoEnVenta}
      togglingOculto={String(togglingOcultoId) === String(r.id)}
      togglingPrecursora={String(togglingPrecursoraId) === String(r.id)}
      saving={saving}
    />
  );

  const renderLista = () => {
    if (recetasFiltradas.length === 0) {
      return (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <p>
            {recetasBase.length === 0
              ? "No hay recetas todavía."
              : "Ninguna receta coincide con los filtros."}
            <br />
            {recetasBase.length === 0 ? "Tocá + para agregar." : "Probá otra búsqueda o filtro."}
          </p>
        </div>
      );
    }

    if (filtroTipo === FILTRO_TIPO.MASAS) {
      return masasFiltradas.map(renderCard);
    }

    if (filtroTipo === FILTRO_TIPO.PRODUCTOS) {
      return gruposProductos.map(({ familia, items }) => (
        <div key={familia || "__sin__"} className="recetas-grupo">
          <p className="recetas-grupo-title">{familia || "Sin familia"}</p>
          {items.map(renderCard)}
        </div>
      ));
    }

    return (
      <>
        {masasFiltradas.length > 0 && (
          <div className="recetas-grupo">
            <p className="recetas-grupo-title">Masas</p>
            {masasFiltradas.map(renderCard)}
          </div>
        )}
        {gruposProductos.map(({ familia, items }) => (
          <div key={familia || "__sin__"} className="recetas-grupo">
            <p className="recetas-grupo-title">{familia || "Productos sin familia"}</p>
            {items.map(renderCard)}
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="content">
      <p className="page-title">Recetas</p>
      <p className="page-subtitle">
        {recetasFiltradas.length} de {recetasBase.length} recetas
        {aplicaFiltroInsumos && " · filtradas por insumos"}
      </p>

      <div className="recetas-toolbar">
        <input
          className="form-input recetas-search"
          type="search"
          placeholder="Buscar receta…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar recetas"
        />
        <div className="recetas-filtros-scroll">
          {[
            [FILTRO_TIPO.TODAS, "Todas"],
            [FILTRO_TIPO.MASAS, "Masas"],
            [FILTRO_TIPO.PRODUCTOS, "Productos"],
            [FILTRO_OCULTAS.SOLO_VISIBLES, "En venta"],
            [FILTRO_OCULTAS.SOLO_OCULTAS, "Ocultas"],
          ].map(([val, label]) => {
            const esTipo = val === FILTRO_TIPO.TODAS || val === FILTRO_TIPO.MASAS || val === FILTRO_TIPO.PRODUCTOS;
            const active = esTipo ? filtroTipo === val : filtroOcultas === val;
            return (
              <button
                key={val}
                type="button"
                className={`recetas-filtro-chip ${active ? "active" : ""}`}
                onClick={() => {
                  if (esTipo) {
                    setFiltroTipo(val);
                  } else {
                    setFiltroOcultas(filtroOcultas === val ? FILTRO_OCULTAS.TODAS : val);
                  }
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <RecetasAlertasBar
          cantProblemas={recetasConProblemas.length}
          cantMargenBajo={recetasMargenBajo.length}
          filtroAlerta={filtroAlerta}
          onFiltroProblemas={() => setFiltroAlerta("problemas")}
          onFiltroMargen={() => setFiltroAlerta("margen")}
          onLimpiarFiltro={() => setFiltroAlerta(null)}
        />
      </div>

      {aplicaFiltroInsumos && onClearFilter && (
        <button type="button" className="btn-secondary" onClick={onClearFilter} style={{ marginBottom: 12 }}>
          Ver todas las recetas
        </button>
      )}

      {filtroAlerta === "problemas" && recetasFiltradas.length > 0 && (
        <p className="recetas-filtro-hint">
          Mostrando recetas con ingredientes incompletos, nombre duplicado o sin renombrar (Copia de…). Tocá una para corregirla.
        </p>
      )}

      {renderLista()}

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
          recetasOrdenadas={masasCatalogo}
          insumosOrdenados={insumosOrdenados}
          recetas={recetasSafe}
          insumos={insumosSafe}
          recetaIngredientes={recetaIngredientesSafe}
          familiasExistentes={familiasExistentes}
          onFamiliaCreada={registrarFamilia}
        />
      )}
    </div>
  );
}
