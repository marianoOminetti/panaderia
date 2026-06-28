import { fmt, pctFmt, parseDecimal } from "../../lib/format";
import { costoReceta } from "../../lib/costos";
import { getTipoReceta, getTipoRecetaLabel } from "../../lib/recetaTipo";

export default function RecetasCard({
  receta,
  recetaIngredientes,
  insumos,
  recetas,
  onEdit,
  onCopy,
  saving,
}) {
  const rindeNum = parseDecimal(receta.rinde) ?? 1;
  const costoLoteCalc = costoReceta(receta.id, recetaIngredientes, insumos, recetas);
  const costoUnitarioCalc = rindeNum > 0 ? costoLoteCalc / rindeNum : null;
  const tieneIngredientes = recetaIngredientes.some((i) => String(i.receta_id) === String(receta.id));
  const costoUnitario = tieneIngredientes ? costoUnitarioCalc : null;
  const precio = parseDecimal(receta.precio_venta) ?? 0;
  const margenVal =
    rindeNum > 0 && precio > 0 && costoUnitario != null && costoUnitario > 0
      ? (precio - costoUnitario) / precio
      : null;
  const margen = margenVal != null ? pctFmt(margenVal) : "—";
  const margenNegativo = margenVal != null && margenVal < 0;
  const tipo = getTipoReceta(receta, recetaIngredientes);
  const tipoLabel = getTipoRecetaLabel(tipo);

  return (
    <div
      className="receta-card"
      onClick={() => onEdit(receta)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onEdit(receta)}
    >
      <div className="receta-top">
        <span className="receta-emoji">{receta.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="receta-nombre">{receta.nombre}</div>
          <div className="receta-rinde">
            Rinde {receta.rinde} {receta.unidad_rinde}
            {receta.familia ? (
              <span className="receta-badge receta-badge--familia"> · {receta.familia}</span>
            ) : null}
          </div>
          <div className="receta-badges">
            <span className={`receta-badge receta-badge--${tipo}`}>{tipoLabel}</span>
            {receta.oculto_en_venta ? (
              <span className="receta-badge receta-badge--muted">Oculto en venta</span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="receta-copy-btn"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(receta);
          }}
          title="Copiar receta"
          disabled={saving}
        >
          📋 Copiar
        </button>
      </div>
      {!receta.es_precursora && (
        <div className="receta-stats">
          <div className="receta-stat">
            <div className="receta-stat-label">Precio venta</div>
            <div className="receta-stat-value">
              {fmt(receta.precio_venta || 0)}/{(receta.unidad_rinde || "u").replace("porción", "porc.")}
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
      )}
    </div>
  );
}
