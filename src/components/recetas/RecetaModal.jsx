/**
 * Modal alta/edición de receta: formulario, ingredientes (insumos/precursoras/costo fijo) y panel de costo/margen.
 * Recibe estado y handlers de useRecetasForm; guardado y eliminación los dispara el padre (Recetas.jsx).
 */
import { fmt, pctFmt, parseDecimal } from "../../lib/format";
import { costoReceta, costoDesdeIngredientes } from "../../lib/costos";
import { aGramos, convertirAUnidadInsumo } from "../../lib/units";
import { SearchableSelect, FormInput, FormMoneyInput, FormCheckbox } from "../ui";

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
  recetaIngredientes,
}) {
  const costoTotal = costoDesdeIngredientes(ingredientes, insumos, recetas, recetaIngredientes);
  const rindeNum = parseDecimal(form.rinde) ?? 0;
  const costoPorUnidad = rindeNum > 0 ? costoTotal / rindeNum : null;
  const precioVenta = parseDecimal(form.precio_venta) ?? 0;
  const margenVal =
    rindeNum > 0 && precioVenta > 0 && costoPorUnidad != null && costoPorUnidad > 0
      ? (precioVenta - costoPorUnidad) / precioVenta
      : null;
  const unidadRinde = form.unidad_rinde || "u";
  const showPanel =
    costoTotal > 0 ||
    ingredientes.some((i) => i.insumo_id || i.receta_id_precursora || (parseDecimal(i.costo_fijo) ?? 0) > 0);
  let margenClass = "";
  if (margenVal != null) {
    if (margenVal < 0.4) margenClass = "rojo";
    else if (margenVal <= 0.6) margenClass = "yellow";
    else margenClass = "green";
  }
  const margenText = margenVal != null ? pctFmt(margenVal) : "—";

  const cantidadPrecursoraAUnidades = (cantidad, unidad, gramosPorUnidad) => {
    const u = (unidad || "u").toLowerCase();
    if (u === "u") return cantidad;
    const gramos = aGramos(cantidad, unidad);
    const gPu = parseDecimal(gramosPorUnidad);
    // Alinear con `src/lib/costos.js`: si falta `gramos_por_unidad` y no está en `u`,
    // no podemos convertir correctamente (evitamos costos enormes).
    if (gPu == null || !Number.isFinite(gPu) || gPu <= 0) return null;
    return gramos / gPu;
  };

  const costoParcialIngrediente = (ing) => {
    // Insumo directo
    if (ing?.insumo_id) {
      const insumo = insumos.find((x) => String(x.id) === String(ing.insumo_id));
      if (!insumo) return null;
      const cant = parseDecimal(ing.cantidad) ?? 0;
      if (cant <= 0) return null;
      const cantidadPresentacion = parseDecimal(insumo?.cantidad_presentacion);
      if (!Number.isFinite(cantidadPresentacion) || cantidadPresentacion <= 0) return null;
      const precio = parseDecimal(insumo?.precio) ?? 0;
      if (precio <= 0) return null;

      const cantConvertida = convertirAUnidadInsumo(
        cant,
        ing.unidad || "g",
        insumo.unidad
      );
      const precioUnitario = precio / cantidadPresentacion;
      const total = precioUnitario * cantConvertida;
      return Number.isFinite(total) ? total : null;
    }

    // Receta precursora
    if (ing?.receta_id_precursora) {
      const prec = recetas.find((r) => String(r.id) === String(ing.receta_id_precursora));
      if (!prec) return null;
      const cantRaw = parseDecimal(ing.cantidad) ?? 0;
      if (cantRaw <= 0) return null;
      const rindeNum = parseDecimal(prec?.rinde) ?? 1;
      const rinde = rindeNum > 0 ? rindeNum : 1;

      const cantidadUnidades = cantidadPrecursoraAUnidades(
        cantRaw,
        ing.unidad || "u",
        prec?.gramos_por_unidad
      );
      if (cantidadUnidades == null) return null;

      const costoPrecLote = costoReceta(
        prec.id,
        recetaIngredientes || [],
        insumos,
        recetas
      );
      const costoUnitPrec = rinde > 0 ? costoPrecLote / rinde : 0;
      const total = cantidadUnidades * costoUnitPrec;
      return Number.isFinite(total) ? total : null;
    }

    // Costo fijo
    const costoFijo = parseDecimal(ing?.costo_fijo);
    if (costoFijo == null || costoFijo <= 0) return null;
    return costoFijo;
  };

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
          <div className="emoji-picker">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className={`emoji-btn ${form.emoji === e ? "active" : ""}`}
                onClick={() => setForm({ ...form, emoji: e })}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <FormInput
          label="Nombre"
          value={form.nombre}
          onChange={(v) => setForm({ ...form, nombre: v })}
          placeholder="Ej: Pan de Molde"
          inputClassName="text-uppercase"
          required
        />

        <div className="form-row">
          <FormInput
            label="Rinde (unidades que salen)"
            type="number"
            min={0.01}
            step={0.01}
            value={form.rinde}
            onChange={(v) => setForm({ ...form, rinde: v })}
            placeholder="4"
            required
          />
          <div className="form-group">
            <label className="form-label">Unidad</label>
            <SearchableSelect
              options={[
                { value: "u", label: "u (unidades)" },
                { value: "kg", label: "kg (kilos)" },
                { value: "porción", label: "porción" },
                { value: "pack", label: "pack" },
              ]}
              value={form.unidad_rinde}
              onChange={(v) => setForm({ ...form, unidad_rinde: v })}
              placeholder="Unidad"
            />
          </div>
        </div>

        <FormMoneyInput
          label={`Precio de venta por ${form.unidad_rinde || "u"}`}
          value={form.precio_venta}
          onChange={(v) => setForm({ ...form, precio_venta: v })}
          placeholder="6000"
        />

        <FormCheckbox
          label="Es receta precursora (se puede usar como ingrediente de otras recetas)"
          checked={!!form.es_precursora}
          onChange={(v) => setForm({ ...form, es_precursora: v })}
        />
        {form.es_precursora && (
          <>
            <FormInput
              label="Gramos por unidad (opcional)"
              type="number"
              min={0}
              value={form.gramos_por_unidad}
              onChange={(v) => setForm({ ...form, gramos_por_unidad: v })}
              placeholder="Ej: 500 si 1 u = 500 g"
            />
            <p className="form-hint" style={{ marginTop: -8 }}>
              Para que otras recetas puedan cargar esta precursora en gramos (ej. 45 g de masa sable).
            </p>
          </>
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
                  flexDirection: "column",
                  gap: 6,
                  marginBottom: 12,
                  padding: 10,
                  background: "var(--cream)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <SearchableSelect
                      options={opcionesCombo}
                      value={valorSelect}
                      onChange={onSelectIng}
                      placeholder="Buscar insumo o receta precursora..."
                      emptyMessage="Sin resultados"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeIng(i)}
                    style={{ color: "var(--text-muted)", flexShrink: 0, padding: "4px 6px" }}
                  >
                    ✕
                  </button>
                </div>
                {(esPrecursora || ing.insumo_id) ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <input
                      className="form-input"
                      style={{ width: 80, flexShrink: 0 }}
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="Cant."
                      aria-label="Cantidad de ingrediente"
                      value={ing.cantidad}
                      onChange={(e) => updateIng(i, "cantidad", e.target.value)}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      en
                    </span>
                    <select
                      className="form-select"
                      style={{ width: 70, flexShrink: 0 }}
                      value={ing.unidad || "g"}
                      onChange={(e) => updateIng(i, "unidad", e.target.value)}
                      aria-label="Unidad del ingrediente"
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
                    style={{ width: "100%" }}
                    type="number"
                    step="any"
                    placeholder="Costo fijo $"
                    aria-label="Costo fijo del ingrediente"
                    value={ing.costo_fijo}
                    onChange={(e) => updateIng(i, "costo_fijo", e.target.value)}
                  />
                )}

                {/* Info rápida: costo individual del ingrediente actual */}
                {true && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text)",
                      marginTop: 6,
                      marginBottom: 2,
                      fontWeight: 800,
                      background: "rgba(120, 80, 255, 0.16)",
                      border: "1px solid rgba(120, 80, 255, 0.42)",
                      borderRadius: 10,
                      padding: "8px 10px",
                    }}
                  >
                    {(() => {
                      const costo = costoParcialIngrediente(ing);
                      return costo != null ? `Costo ingrediente: ${fmt(costo)}` : "Costo ingrediente: —";
                    })()}
                  </div>
                )}
              </div>
            );
          })}
          <button
            type="button"
            className="btn-dashed"
            onClick={addIng}
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
