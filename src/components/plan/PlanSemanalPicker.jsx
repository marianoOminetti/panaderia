import { useMemo } from "react";
import { useFilterBySearch } from "../../hooks/useFilterBySearch";
import ProductSearchInput from "../ui/ProductSearchInput";
import { ventasRecetaSemanaAnterior } from "../../lib/planSugerencias";

export default function PlanSemanalPicker({ recetas, ventas, weekStart, onPick, onClose }) {
  const productos = useMemo(
    () => (recetas || []).filter((r) => !r.es_precursora && !r.oculto_en_venta),
    [recetas],
  );
  const { search, setSearch, filteredItems } = useFilterBySearch(productos, "nombre");

  return (
    <div className="plan-semanal-picker">
      <div className="plan-picker-tabs">
        <span className="plan-picker-tab active" style={{ cursor: "default" }}>
          Productos
        </span>
        <button type="button" className="plan-dia-picker-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </div>
      <ProductSearchInput value={search} onChange={setSearch} placeholder="Buscar producto…" />
      <div className="plan-dia-picker-list">
        {filteredItems.length === 0 ? (
          <p className="plan-dia-card-empty">Sin resultados</p>
        ) : (
          filteredItems.map((r) => {
            const vendido = ventasRecetaSemanaAnterior(ventas, r.id, weekStart);
            return (
              <button key={r.id} type="button" className="plan-picker-row" onClick={() => onPick(r)}>
                <span className="plan-picker-emoji">{r.emoji}</span>
                <span className="plan-picker-nombre">{r.nombre}</span>
                {vendido > 0 && (
                  <span className="plan-hint" title="Referencia — no es lo que tenés que producir">
                    ref. {vendido} u
                  </span>
                )}
                <span className="plan-picker-add">+</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
