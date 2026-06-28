import { useState, useMemo } from "react";
import { useFilterBySearch } from "../../hooks/useFilterBySearch";
import ProductSearchInput from "../ui/ProductSearchInput";
import QuantityControl from "../ui/QuantityControl";
import {
  DIAS_LARGO,
  NUM_DIAS,
  fechaDiaSemanaLabel,
} from "../../lib/planSugerencias";

function PlanDiaPicker({ diaIdx, recetas, onPick, onClose }) {
  const [tab, setTab] = useState(diaIdx === 0 ? "masas" : "productos");
  const productos = useMemo(
    () => (recetas || []).filter((r) => !r.es_precursora && !r.oculto_en_venta),
    [recetas],
  );
  const masas = useMemo(() => (recetas || []).filter((r) => r.es_precursora), [recetas]);
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
                const qty = item.porDia[diaIdx] || 0;
                const unidad = item.receta.unidad_rinde || "u";
                const esMasa = item.receta.es_precursora;

                return (
                  <div key={item.receta.id} className="plan-dia-item">
                    <span className="plan-dia-item-emoji">{item.receta.emoji}</span>
                    <div className="plan-dia-item-info">
                      <span className="plan-dia-item-nombre">{item.receta.nombre}</span>
                      <span className="plan-dia-item-sub">
                        {esMasa ? "Masa" : "Producto"}
                      </span>
                    </div>
                    <QuantityControl
                      value={qty}
                      onChange={(n) => {
                        const val = esMasa
                          ? Math.max(0, Math.round(n * 10) / 10)
                          : Math.max(0, Math.round(n));
                        updatePlanCartItem(item.receta.id, { porDiaIdx: diaIdx, porDiaVal: val });
                      }}
                      min={0}
                      allowDecimals={esMasa}
                      size="sm"
                      disabled={saving}
                    />
                    <span className="plan-semanal-unidad">{unidad}</span>
                  </div>
                );
              })}
            </div>

            {pickerAbierto ? (
              <PlanDiaPicker
                diaIdx={diaIdx}
                recetas={recetas}
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
