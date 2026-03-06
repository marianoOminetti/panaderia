/**
 * Modal alta/edición de receta: formulario, ingredientes (insumos/precursoras/costo fijo) y panel de costo/margen.
 * Recibe estado y handlers de useRecetasForm; guardado y eliminación los dispara el padre (Recetas.jsx).
 */
import { fmt, pctFmt, parseDecimal } from "../../lib/format";
import { costoDesdeIngredientes } from "../../lib/costos";
import SearchableSelect from "../ui/SearchableSelect";

const EMOJIS = ["🍞", "🥐", "🍕", "🍫", "🍪", "🥧", "🍰", "🧁", "🫔", "🥬", "🍗", "🍔", "🎂", "🧇", "🥨"];

export default function RecetaModal({
  editando,
  form,
  setForm,
  ingredientes,
  setIngredientes,
  addIng,
  removeIng,
  updateIng,
  saving,
  closeModal,
  onSave,
  onEliminar,
  recetasOrdenadas,
  insumosOrdenados,
  recetas,
  insumos,
}) {
  const costoTotal = costoDesdeIngredientes(ingredientes, insumos, recetas);
  const rindeNum = parseDecimal(form.rinde) ?? 0;
  const costoPorUnidad = rindeNum > 0 ? costoTotal / rindeNum : null;
  const precioVenta = parseDecimal(form.precio_venta) ?? 0;
  const margenVal =
    rindeNum > 0 && precioVenta > 0 && costoPorUnidad != null && costoPorUnidad >= 0
      ? (precioVenta - costoPorUnidad) / precioVenta
      : null;
  const unidadRinde = form.unidad_rinde || "u";
  const showPanel =
    costoTotal > 0 ||
    ingredientes.some((i) => i.insumo_id || i.receta_id_precursora || i.costo_fijo) ||
    precioVenta > 0;
  let margenClass = "";
  if (margenVal != null) {
    if (margenVal < 0.4) margenClass = "rojo";
    else if (margenVal <= 0.6) margenClass = "yellow";
    else margenClass = "green";
  }
  const margenText = margenVal != null ? pctFmt(margenVal) : "—";

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={closeModal}>
          ← Volver
        </button>
        <span className="screen-title">{editando ? "Editar receta" : "Nueva receta"}</span>
      </div>
      <div className="screen-content">
        <div className="form-group">
          <label className="form-label">Emoji</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setForm({ ...form, emoji: e })}
                style={{
                  fontSize: 20,
                  background: form.emoji === e ? "var(--purple-dark)" : "var(--cream)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: form.emoji === e ? "white" : "inherit",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input
            className="form-input"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Pan de Molde"
            style={{ textTransform: "uppercase" }}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Rinde (unidades que salen)</label>
            <input
              className="form-input"
              type="number"
              min="0.01"
              step="0.01"
              value={form.rinde}
              onChange={(e) => setForm({ ...form, rinde: e.target.value })}
              placeholder="4"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Unidad</label>
            <select
              className="form-select"
              value={form.unidad_rinde}
              onChange={(e) => setForm({ ...form, unidad_rinde: e.target.value })}
            >
              {["u", "kg", "porción", "pack"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Precio de venta por {form.unidad_rinde || "u"} ($)
          </label>
          <input
            className="form-input"
            type="number"
            value={form.precio_venta}
            onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
            placeholder="6000"
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="receta-es-precursora"
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}
          >
            <input
              id="receta-es-precursora"
              type="checkbox"
              checked={!!form.es_precursora}
              onChange={() => setForm({ ...form, es_precursora: !form.es_precursora })}
              style={{ width: 18, height: 18 }}
            />
            Es receta precursora (se puede usar como ingrediente de otras recetas)
          </label>
        </div>
        {form.es_precursora && (
          <div className="form-group">
            <label className="form-label">Gramos por unidad (opcional)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="any"
              placeholder="Ej: 500 si 1 u = 500 g"
              value={form.gramos_por_unidad}
              onChange={(e) => setForm({ ...form, gramos_por_unidad: e.target.value })}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Para que otras recetas puedan cargar esta precursora en gramos (ej. 45 g de masa
              sable).
            </span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Ingredientes</label>
          {ingredientes.map((ing, i) => {
            const esPrecursora = !!ing.receta_id_precursora;
            const recetasPrecursoras = recetasOrdenadas.filter(
              (rec) => rec.id !== editando?.id && !!rec.es_precursora
            );
            const valorSelect = ing.receta_id_precursora
              ? `r:${ing.receta_id_precursora}`
              : ing.insumo_id
                ? `i:${ing.insumo_id}`
                : "";
            const opcionesCombo = [
              { value: "", label: "Insumo, receta precursora o costo fijo..." },
              ...insumosOrdenados.map((ins) => ({ value: `i:${ins.id}`, label: ins.nombre })),
              ...recetasPrecursoras.map((rec) => ({
                value: `r:${rec.id}`,
                label: `${rec.emoji || ""} ${rec.nombre}`.trim(),
              })),
            ];
            const onSelectIng = (val) => {
              if (!val) {
                setIngredientes((prev) =>
                  prev.map((item, idx) =>
                    idx !== i ? item : { ...item, insumo_id: "", receta_id_precursora: "" }
                  )
                );
                return;
              }
              if (val.startsWith("r:")) {
                setIngredientes((prev) =>
                  prev.map((item, idx) =>
                    idx !== i
                      ? item
                      : { ...item, receta_id_precursora: val.slice(2), insumo_id: "", unidad: "g" }
                  )
                );
              } else {
                setIngredientes((prev) =>
                  prev.map((item, idx) =>
                    idx !== i
                      ? item
                      : {
                          ...item,
                          insumo_id: val.startsWith("i:") ? val.slice(2) : val,
                          receta_id_precursora: "",
                        }
                  )
                );
              }
            };
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flex: "1 1 100px",
                      minWidth: 0,
                    }}
                  >
                    <input
                      className="form-input"
                      style={{ flex: "1 1 0", minWidth: 50 }}
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="Cant."
                      value={ing.cantidad}
                      onChange={(e) => updateIng(i, "cantidad", e.target.value)}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      en
                    </span>
                    <select
                      className="form-select"
                      style={{ flexShrink: 0, minWidth: 72, width: "auto" }}
                      value={ing.unidad || "g"}
                      onChange={(e) => updateIng(i, "unidad", e.target.value)}
                      title="Unidad"
                    >
                      {["g", "ml", "u", "kg"].map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : ing.insumo_id ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flex: "1 1 100px",
                      minWidth: 0,
                    }}
                  >
                    <input
                      className="form-input"
                      style={{ flex: "1 1 0", minWidth: 50 }}
                      type="number"
                      step="any"
                      placeholder="Cant."
                      value={ing.cantidad}
                      onChange={(e) => updateIng(i, "cantidad", e.target.value)}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      en
                    </span>
                    <select
                      className="form-select"
                      style={{ flexShrink: 0, minWidth: 72, width: "auto" }}
                      value={ing.unidad}
                      onChange={(e) => updateIng(i, "unidad", e.target.value)}
                      title="Unidad"
                    >
                      {["g", "ml", "u", "kg"].map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    className="form-input"
                    style={{ flex: "1 1 100px" }}
                    type="number"
                    step="any"
                    placeholder="Costo fijo $"
                    value={ing.costo_fijo}
                    onChange={(e) => updateIng(i, "costo_fijo", e.target.value)}
                  />
                )}
                <button
                  onClick={() => removeIng(i)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 16,
                    cursor: "pointer",
                    color: "#999",
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            onClick={addIng}
            style={{
              background: "none",
              border: "1px dashed #C8A97E",
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 13,
              color: "#6B3F1F",
              cursor: "pointer",
              width: "100%",
              marginTop: 4,
            }}
          >
            + Agregar ingrediente
          </button>
        </div>

        <button
          className="btn-primary"
          onClick={onSave}
          disabled={saving || !form.nombre || !form.rinde}
        >
          {saving ? "Guardando..." : editando ? "Guardar cambios" : "Guardar receta"}
        </button>
        {editando && (
          <button className="btn-danger" onClick={onEliminar} disabled={saving}>
            Eliminar receta
          </button>
        )}
        <button className="btn-secondary" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      {showPanel && (
        <div
          className="receta-cost-panel"
          style={{
            borderTop: "1px solid var(--border)",
            padding: "10px 16px 14px",
            background: "var(--surface)",
          }}
        >
          <div className="stats-row" style={{ marginBottom: 0 }}>
            <div className="stat-card">
              <div className="stat-label">Costo total lote</div>
              <div className="stat-value">{fmt(costoTotal)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Costo por {unidadRinde}</div>
              <div className="stat-value accent">
                {rindeNum > 0 ? fmt(costoPorUnidad) : "—"}
              </div>
            </div>
            <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
              <div className="stat-label">Margen</div>
              <div className={`stat-value ${margenClass}`}>{margenText}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
