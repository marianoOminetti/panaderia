import { useState, useMemo } from "react";
import { useFilterBySearch } from "../../hooks/useFilterBySearch";
import ProductSearchInput from "../ui/ProductSearchInput";
import QuantityControl from "../ui/QuantityControl";
import {
  DIAS_LARGO,
  NUM_DIAS,
  fechaDiaSemanaLabel,
} from "../../lib/planSugerencias";
import { getTipoReceta, TIPO_RECETA } from "../../lib/recetaTipo";
import {
  formatCantidadMasaPlan,
  gramosDesdeLotesMasa,
  lotesDesdeGramosMasa,
  usaGramosEnPlanMasa,
  etiquetaCantidadMasaPlan,
  getHijosDeMasa,
} from "../../lib/planMasa";

function PlanDiaPicker({ diaIdx, recetas, recetaIngredientes, onPick, onClose }) {
  const [tab, setTab] = useState(diaIdx === 0 ? "masas" : "productos");
  const [masaSub, setMasaSub] = useState("todas");
  const productos = useMemo(
    () => (recetas || []).filter((r) => !r.es_precursora && !r.oculto_en_venta),
    [recetas],
  );
  const masas = useMemo(() => {
    const all = (recetas || []).filter((r) => r.es_precursora);
    if (masaSub === "base") {
      return all.filter((r) => getTipoReceta(r, recetaIngredientes) === TIPO_RECETA.MASA_BASE);
    }
    if (masaSub === "porcionadas") {
      return all.filter((r) => getTipoReceta(r, recetaIngredientes) === TIPO_RECETA.MASA_PORCIONADA);
    }
    return all;
  }, [recetas, recetaIngredientes, masaSub]);
  const list = tab === "masas" ? masas : productos;
  const { search, setSearch, filteredItems } = useFilterBySearch(list, "nombre");

  return (
    <div className="plan-dia-picker">
      <div className="plan-picker-tabs">
        <button type="button" className={`plan-picker-tab ${tab === "masas" ? "active" : ""}`} onClick={() => setTab("masas")}>
          Masas
        </button>
        <button type="button" className={`plan-picker-tab ${tab === "productos" ? "active" : ""}`} onClick={() => setTab("productos")}>
          Productos
        </button>
        <button type="button" className="plan-dia-picker-close" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      {tab === "masas" && (
        <div className="plan-picker-tabs recetas-masa-subtabs">
          <button type="button" className={`plan-picker-tab ${masaSub === "todas" ? "active" : ""}`} onClick={() => setMasaSub("todas")}>
            Todas
          </button>
          <button type="button" className={`plan-picker-tab ${masaSub === "base" ? "active" : ""}`} onClick={() => setMasaSub("base")}>
            Base
          </button>
          <button type="button" className={`plan-picker-tab ${masaSub === "porcionadas" ? "active" : ""}`} onClick={() => setMasaSub("porcionadas")}>
            Porcionadas
          </button>
        </div>
      )}
      <ProductSearchInput
        value={search}
        onChange={setSearch}
        placeholder={tab === "masas" ? "Buscar masa…" : "Buscar producto…"}
      />
      <div className="plan-dia-picker-list">
        {filteredItems.length === 0 ? (
          <p className="plan-dia-card-empty">Sin resultados</p>
        ) : (
          filteredItems.map((r) => (
              <button key={r.id} type="button" className="plan-picker-row" onClick={() => onPick(r)}>
                <span className="plan-picker-emoji">{r.emoji}</span>
                <span className="plan-picker-nombre">{r.nombre}</span>
                <span className="plan-picker-add">+</span>
              </button>
            ))
        )}
      </div>
    </div>
  );
}

function sortPorDiaItems(items) {
  return [...items].sort((a, b) => {
    const ma = a.receta.es_precursora ? 0 : 1;
    const mb = b.receta.es_precursora ? 0 : 1;
    if (ma !== mb) return ma - mb;
    return (a.receta.nombre || "").localeCompare(b.receta.nombre || "", "es");
  });
}

export default function PlanSemanalVistaDia({
  weekStart,
  cartPlanItems,
  recetas,
  recetaIngredientes,
  saving,
  addToPlanOnDay,
  updatePlanCartItem,
  onShareDay,
}) {
  const [diaPickerAbierto, setDiaPickerAbierto] = useState(null);

  return (
    <div className="plan-vista-dia">
      <p className="plan-reparto-intro">
        Armá qué se produce cada día. Ej: sábado masas, lunes facturas, martes panes.
      </p>
      {Array.from({ length: NUM_DIAS }, (_, diaIdx) => {
        const itemsDelDia = sortPorDiaItems(
          cartPlanItems.filter((it) => (it.porDia?.[diaIdx] || 0) > 0),
        );
        const pickerAbierto = diaPickerAbierto === diaIdx;
        const tieneMasas = itemsDelDia.some((it) => it.receta.es_precursora);
        const tieneProductos = itemsDelDia.some((it) => !it.receta.es_precursora);

        return (
          <div key={diaIdx} className="plan-dia-card">
            <div className="plan-dia-card-header">
              <div className="plan-dia-card-heading">
                <span className="plan-dia-card-title">{DIAS_LARGO[diaIdx]}</span>
                <span className="plan-dia-card-fecha">{fechaDiaSemanaLabel(weekStart, diaIdx)}</span>
              </div>
              <div className="plan-dia-card-actions">
                {itemsDelDia.length > 0 && (
                  <span className="plan-dia-card-total">
                    {tieneMasas && tieneProductos
                      ? `${itemsDelDia.length} ítems`
                      : `${itemsDelDia.reduce((s, it) => s + (it.porDia[diaIdx] || 0), 0)} total`}
                  </span>
                )}
                {itemsDelDia.length > 0 && onShareDay && (
                  <button
                    type="button"
                    className="plan-icon-btn plan-icon-btn--sm"
                    onClick={() => onShareDay(diaIdx)}
                    disabled={saving}
                    title={`Compartir plan del ${DIAS_LARGO[diaIdx].toLowerCase()}`}
                    aria-label={`Compartir plan del ${DIAS_LARGO[diaIdx]}`}
                  >
                    <span className="plan-icon-btn__emoji" aria-hidden>📤</span>
                  </button>
                )}
              </div>
            </div>

            <div className="plan-dia-card-items">
              {itemsDelDia.length === 0 && !pickerAbierto && (
                <p className="plan-dia-card-empty">Nada planificado</p>
              )}
              {itemsDelDia.map((item) => {
                const qtyLotes = item.porDia[diaIdx] || 0;
                const esMasa = item.receta.es_precursora;
                const hijos = esMasa
                  ? getHijosDeMasa(item.receta.id, recetaIngredientes || [], recetas || [])
                  : [];
                const enGramos = esMasa && usaGramosEnPlanMasa(item.receta);
                const qtyDisplay = enGramos
                  ? gramosDesdeLotesMasa(item.receta, qtyLotes)
                  : qtyLotes;
                const fmtDia = formatCantidadMasaPlan(item.receta, qtyLotes);
                const fmtUnidad = enGramos ? fmtDia.unidad : (item.receta.unidad_rinde || "u");

                return (
                  <div key={item.receta.id} className="plan-dia-item">
                    <span className="plan-dia-item-emoji">{item.receta.emoji}</span>
                    <div className="plan-dia-item-info">
                      <span className="plan-dia-item-nombre">{item.receta.nombre}</span>
                      <span className="plan-dia-item-sub">
                        {esMasa ? "Masa" : "Producto"}
                        {esMasa && hijos.length > 0 && (
                          <> · Alimenta: {hijos.map((h) => h.nombre).slice(0, 3).join(", ")}{hijos.length > 3 ? "…" : ""}</>
                        )}
                        {esMasa && item.cantidad > 0 && (
                          <> · Total semanal: {etiquetaCantidadMasaPlan(item.receta, item.cantidad)}</>
                        )}
                      </span>
                    </div>
                    <QuantityControl
                      value={qtyDisplay}
                      onChange={(n) => {
                        let val;
                        if (enGramos) {
                          val = Math.max(0, Math.round(lotesDesdeGramosMasa(item.receta, n) * 1000) / 1000);
                        } else if (esMasa) {
                          val = Math.max(0, Math.round(n * 10) / 10);
                        } else {
                          val = Math.max(0, Math.round(n));
                        }
                        updatePlanCartItem(item.receta.id, { porDiaIdx: diaIdx, porDiaVal: val });
                      }}
                      min={0}
                      step={enGramos ? 50 : 1}
                      allowDecimals={esMasa}
                      size="sm"
                      disabled={saving}
                    />
                    <span className="plan-semanal-unidad">{fmtUnidad}</span>
                  </div>
                );
              })}
            </div>

            {pickerAbierto ? (
              <PlanDiaPicker
                diaIdx={diaIdx}
                recetas={recetas}
                recetaIngredientes={recetaIngredientes}
                onPick={(receta) => {
                  const step = receta.es_precursora ? 1 : 1;
                  addToPlanOnDay(receta, diaIdx, step);
                  setDiaPickerAbierto(null);
                }}
                onClose={() => setDiaPickerAbierto(null)}
              />
            ) : (
              <button
                type="button"
                className="plan-dia-add-btn"
                onClick={() => setDiaPickerAbierto(diaIdx)}
                disabled={saving}
              >
                + Agregar a {DIAS_LARGO[diaIdx].toLowerCase()}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
