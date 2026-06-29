import { fmt, pctFmt, parseDecimal } from "../../lib/format";
import { costoReceta } from "../../lib/costos";

export default function RecetaCard({
  receta: r,
  recetaIngredientes,
  insumos,
  recetas,
  problemas = [],
  onEdit,
  onCopy,
  onTogglePrecursora,
  onToggleOculto,
  togglingOculto,
  togglingPrecursora,
  saving,
}) {
  const rindeNum = parseDecimal(r.rinde) ?? 1;
  const costoLoteCalc = costoReceta(r.id, recetaIngredientes, insumos, recetas);
  const costoUnitarioCalc = rindeNum > 0 ? costoLoteCalc / rindeNum : null;
  const tieneIngredientes = recetaIngredientes.some((i) => String(i.receta_id) === String(r.id));
  const costoUnitario = tieneIngredientes ? costoUnitarioCalc : null;
  const margenVal =
    rindeNum > 0 &&
    (parseDecimal(r.precio_venta) ?? 0) > 0 &&
    costoUnitario != null &&
    costoUnitario > 0
      ? ((parseDecimal(r.precio_venta) ?? 0) - costoUnitario) / (parseDecimal(r.precio_venta) ?? 0)
      : null;
  const margen = margenVal != null ? pctFmt(margenVal) : "—";
  const margenNegativo = margenVal != null && margenVal < 0;
  const familia = (r.familia || "").trim();
  const unidadRinde = (r.unidad_rinde || "u").replace("porción", "porc.");

  return (
    <div
      className={`receta-card ${r.oculto_en_venta ? "receta-card--oculta" : ""} ${problemas.length ? "receta-card--warn" : ""}`}
      onClick={() => onEdit(r)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onEdit(r)}
    >
      <div className="receta-top">
        <span className="receta-emoji">{r.emoji || "🍞"}</span>
        <div className="receta-top-main">
          <div className="receta-nombre">{r.nombre}</div>
          <div className="receta-meta">
            <span>
              Rinde {r.rinde} {unidadRinde}
            </span>
            {r.es_precursora && <span className="receta-meta-tag">Masa</span>}
            {r.oculto_en_venta && <span className="receta-meta-tag receta-meta-tag--muted">Oculta</span>}
            {familia && <span className="receta-meta-tag receta-meta-tag--familia">{familia}</span>}
          </div>
        </div>
      </div>

      <div className="receta-stats">
        <div className="receta-stat">
          <div className="receta-stat-label">Precio</div>
          <div className="receta-stat-value">
            {!(parseDecimal(r.precio_venta) > 0)
              ? "—"
              : `${fmt(r.precio_venta || 0)}/${unidadRinde}`}
          </div>
        </div>
        <div className="receta-stat">
          <div className="receta-stat-label">Costo/u</div>
          <div className="receta-stat-value">{costoUnitario != null ? fmt(costoUnitario) : "—"}</div>
        </div>
        <div className="receta-stat">
          <div className="receta-stat-label">Margen</div>
          <div className={`receta-stat-value ${margenNegativo ? "rojo" : margenVal != null ? "verde" : ""}`}>
            {margen}
          </div>
        </div>
      </div>

      {problemas.length > 0 && (
        <ul className="receta-problemas" aria-label="Problemas a corregir">
          {problemas.map((msg, i) => (
            <li key={`${i}-${msg}`}>{msg}</li>
          ))}
        </ul>
      )}

      <div className="receta-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`receta-action-btn ${r.oculto_en_venta ? "active" : ""}`}
          onClick={() => onToggleOculto(r)}
          disabled={togglingOculto || saving}
          title={r.oculto_en_venta ? "Mostrar en venta" : "Ocultar en venta"}
        >
          {r.oculto_en_venta ? "Mostrar" : "Ocultar"}
        </button>
        <button
          type="button"
          className={`receta-action-btn receta-action-btn--masa ${r.es_precursora ? "active" : ""}`}
          onClick={() => onTogglePrecursora(r)}
          disabled={togglingPrecursora || saving}
          title={
            r.es_precursora
              ? "Quitar como precursora"
              : "Marcar como precursora (usable como ingrediente en otras recetas)"
          }
        >
          {r.es_precursora ? "No precursora" : "Precursora"}
        </button>
        <button type="button" className="receta-action-btn" onClick={() => onCopy(r)} disabled={saving}>
          Copiar
        </button>
      </div>
    </div>
  );
}
