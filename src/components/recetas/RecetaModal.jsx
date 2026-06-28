/**
 * Modal alta/edición de receta: tipo (masa/producto), familia, ingredientes y asistentes de masa.
 */
import { useState, useMemo } from "react";
import { fmt, pctFmt, parseDecimal } from "../../lib/format";
import { costoReceta, costoDesdeIngredientes } from "../../lib/costos";
import { aGramos, convertirAUnidadInsumo } from "../../lib/units";
import { SearchableSelect, FormInput, FormMoneyInput, FormCheckbox } from "../ui";
import {
  TIPO_RECETA,
  getTipoRecetaLabel,
  tipoFromForm,
  productoUsaPrecursora,
} from "../../lib/recetaTipo";
import { advertenciasCosteoIngredientes } from "../../lib/recetaCostoCascade";
import {
  WizardExtraerMasa,
  WizardPorciones,
  WizardVariante,
} from "./RecetaMasasWizards";

const EMOJIS = ["🍞", "🥐", "🍕", "🍫", "🍪", "🥧", "🍰", "🧁", "🫔", "🥬", "🍗", "🍔", "🎂", "🧇", "🥨"];

const TIPO_OPCIONES = [
  { value: TIPO_RECETA.PRODUCTO, label: "Producto" },
  { value: TIPO_RECETA.MASA_BASE, label: "Masa base" },
  { value: TIPO_RECETA.MASA_PORCIONADA, label: "Masa porcionada" },
];

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
  setTipoReceta,
  recetasOrdenadas,
  insumosOrdenados,
  recetas,
  insumos,
  recetaIngredientes,
  familiasExistentes = [],
  onExtraerMasa,
  onCreatePorciones,
  onNuevaVariante,
}) {
  const [wizard, setWizard] = useState(null);
  const tipoActual = form.tipo_receta || tipoFromForm(form, ingredientes);

  const masaPorcionadaValida =
    tipoActual !== TIPO_RECETA.MASA_PORCIONADA ||
    (form.masa_base_id && parseDecimal(form.gramos_por_unidad) > 0);

  const masasBase = useMemo(
    () => (recetas || []).filter((r) => r.es_precursora && String(r.id) !== String(editando?.id)),
    [recetas, editando?.id],
  );

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
    if (gPu == null || !Number.isFinite(gPu) || gPu <= 0) return null;
    return gramos / gPu;
  };

  const costoParcialIngrediente = (ing) => {
    if (ing?.insumo_id) {
      const insumo = insumos.find((x) => String(x.id) === String(ing.insumo_id));
      if (!insumo) return null;
      const cant = parseDecimal(ing.cantidad) ?? 0;
      if (cant <= 0) return null;
      const cantidadPresentacion = parseDecimal(insumo?.cantidad_presentacion);
      if (!Number.isFinite(cantidadPresentacion) || cantidadPresentacion <= 0) return null;
      const precio = parseDecimal(insumo?.precio) ?? 0;
      if (precio <= 0) return null;
      const cantConvertida = convertirAUnidadInsumo(cant, ing.unidad || "g", insumo.unidad, insumo);
      const precioUnitario = precio / cantidadPresentacion;
      const total = precioUnitario * cantConvertida;
      return Number.isFinite(total) ? total : null;
    }
    if (ing?.receta_id_precursora) {
      const prec = recetas.find((r) => String(r.id) === String(ing.receta_id_precursora));
      if (!prec) return null;
      const cantRaw = parseDecimal(ing.cantidad) ?? 0;
      if (cantRaw <= 0) return null;
      const rindePrec = parseDecimal(prec?.rinde) ?? 1;
      const rinde = rindePrec > 0 ? rindePrec : 1;
      const cantidadUnidades = cantidadPrecursoraAUnidades(cantRaw, ing.unidad || "u", prec?.gramos_por_unidad);
      if (cantidadUnidades == null) return null;
      const costoPrecLote = costoReceta(prec.id, recetaIngredientes || [], insumos, recetas);
      const costoUnitPrec = rinde > 0 ? costoPrecLote / rinde : 0;
      const total = cantidadUnidades * costoUnitPrec;
      return Number.isFinite(total) ? total : null;
    }
    const costoFijo = parseDecimal(ing?.costo_fijo);
    if (costoFijo == null || costoFijo <= 0) return null;
    return costoFijo;
  };

  const handleTipoChange = (tipo) => {
    setTipoReceta(tipo);
    if (tipo === TIPO_RECETA.MASA_PORCIONADA) {
      setIngredientes([]);
      setForm((prev) => ({ ...prev, masa_base_id: "", gramos_por_unidad: prev.gramos_por_unidad || "45" }));
      return;
    }
    if (tipo === TIPO_RECETA.MASA_BASE) {
      setForm((prev) => ({ ...prev, masa_base_id: "" }));
    }
  };

  const handleMasaBaseChange = (masaBaseId) => {
    setForm((prev) => ({ ...prev, masa_base_id: masaBaseId }));
    const gramos = form.gramos_por_unidad || "45";
    if (masaBaseId) {
      setIngredientes([
        {
          insumo_id: "",
          receta_id_precursora: masaBaseId,
          cantidad: gramos,
          unidad: "g",
          costo_fijo: "",
        },
      ]);
    }
  };

  const handleGramosPorcionChange = (v) => {
    setForm((prev) => ({ ...prev, gramos_por_unidad: v }));
    if (tipoActual === TIPO_RECETA.MASA_PORCIONADA && form.masa_base_id) {
      setIngredientes([
        {
          insumo_id: "",
          receta_id_precursora: form.masa_base_id,
          cantidad: v || "45",
          unidad: "g",
          costo_fijo: "",
        },
      ]);
    }
  };

  const sinPrecursora =
    tipoActual === TIPO_RECETA.PRODUCTO &&
    editando &&
    !productoUsaPrecursora(editando.id, recetaIngredientes);

  const avisosCosteo = advertenciasCosteoIngredientes(
    ingredientes,
    insumos,
    recetas,
    recetaIngredientes,
  );

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
          <label className="form-label">Tipo de receta</label>
          <div className="plan-picker-tabs receta-tipo-tabs">
            {TIPO_OPCIONES.map((op) => (
              <button
                key={op.value}
                type="button"
                className={`plan-picker-tab ${tipoActual === op.value ? "active" : ""}`}
                onClick={() => handleTipoChange(op.value)}
              >
                {op.label}
              </button>
            ))}
          </div>
          <p className="form-hint">
            {tipoActual === TIPO_RECETA.MASA_BASE && "Batch que amás (no se vende al mostrador)."}
            {tipoActual === TIPO_RECETA.MASA_PORCIONADA && "Porción pesada de una masa base (ej. 45 g)."}
            {tipoActual === TIPO_RECETA.PRODUCTO && "Lo que vendés. Podés usar masas como ingredientes."}
          </p>
        </div>

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

        <FormInput
          label="Familia (opcional)"
          value={form.familia}
          onChange={(v) => setForm({ ...form, familia: v })}
          placeholder="Ej: Brownie, Pastafrola"
          list="receta-familias-list"
        />
        {familiasExistentes.length > 0 && (
          <datalist id="receta-familias-list">
            {familiasExistentes.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        )}

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
                { value: "g", label: "g (gramos)" },
                { value: "porción", label: "porción" },
                { value: "pack", label: "pack" },
              ]}
              value={form.unidad_rinde}
              onChange={(v) => setForm({ ...form, unidad_rinde: v })}
              placeholder="Unidad"
            />
          </div>
        </div>

        {tipoActual === TIPO_RECETA.PRODUCTO && (
          <FormMoneyInput
            label={`Precio de venta por ${form.unidad_rinde || "u"}`}
            value={form.precio_venta}
            onChange={(v) => setForm({ ...form, precio_venta: v })}
            placeholder="6000"
          />
        )}

        <FormCheckbox
          label="Ocultar en venta (no aparece al cargar una venta nueva)"
          checked={!!form.oculto_en_venta}
          onChange={(v) => setForm({ ...form, oculto_en_venta: v })}
        />

        {tipoActual === TIPO_RECETA.MASA_PORCIONADA && (
          <>
            <div className="form-group">
              <label className="form-label">Masa base</label>
              <SearchableSelect
                options={[
                  { value: "", label: "Elegir masa base…" },
                  ...masasBase.map((r) => ({
                    value: r.id,
                    label: `${r.emoji || ""} ${r.nombre}`.trim(),
                  })),
                ]}
                value={form.masa_base_id || ""}
                onChange={handleMasaBaseChange}
                placeholder="Masa base"
              />
            </div>
            <FormInput
              label="Gramos por unidad"
              type="number"
              min={1}
              value={form.gramos_por_unidad}
              onChange={handleGramosPorcionChange}
              placeholder="Ej: 45"
            />
          </>
        )}

        {tipoActual === TIPO_RECETA.MASA_BASE && (
          <FormInput
            label="Gramos por unidad (opcional)"
            type="number"
            min={0}
            value={form.gramos_por_unidad}
            onChange={(v) => setForm({ ...form, gramos_por_unidad: v })}
            placeholder="Ej: 1000 si 1 u = 1 kg de masa"
          />
        )}

        {tipoActual === TIPO_RECETA.PRODUCTO && (
          <p className="form-hint">
            ¿Usa una masa? Elegila como ingrediente precursora abajo, o usá «Extraer masa» si todavía tiene insumos crudos.
          </p>
        )}

        {editando && (
          <div className="receta-wizard-actions-inline">
            {tipoActual === TIPO_RECETA.PRODUCTO && onExtraerMasa && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => setWizard("extraer")}>
                Extraer masa
              </button>
            )}
            {tipoActual === TIPO_RECETA.MASA_BASE && onCreatePorciones && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => setWizard("porciones")}>
                Crear porciones
              </button>
            )}
            {tipoActual === TIPO_RECETA.PRODUCTO && onNuevaVariante && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => setWizard("variante")}>
                Nueva variante
              </button>
            )}
          </div>
        )}

        {avisosCosteo.length > 0 && (
          <div className="receta-hint-warn" style={{ marginBottom: 12 }}>
            {avisosCosteo.map((a) => (
              <p key={a} className="form-hint" style={{ color: "var(--danger)", margin: "4px 0" }}>
                ⚠️ {a}
              </p>
            ))}
          </div>
        )}

        {sinPrecursora && form.familia && (
          <p className="form-hint receta-hint-warn">
            Este producto de familia «{form.familia}» no usa ninguna masa como ingrediente.
          </p>
        )}

        {tipoActual !== TIPO_RECETA.MASA_PORCIONADA && (
          <div className="form-group">
            <label className="form-label">Ingredientes</label>
            {ingredientes.map((ing, i) => {
              const esPrecursora = !!ing.receta_id_precursora;
              const recetasPrecursoras = recetasOrdenadas.filter(
                (rec) => rec.id !== editando?.id && !!rec.es_precursora,
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
                      idx !== i ? item : { ...item, insumo_id: "", receta_id_precursora: "" },
                    ),
                  );
                  return;
                }
                if (val.startsWith("r:")) {
                  setIngredientes((prev) =>
                    prev.map((item, idx) =>
                      idx !== i
                        ? item
                        : { ...item, receta_id_precursora: val.slice(2), insumo_id: "", unidad: "g" },
                    ),
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
                          },
                    ),
                  );
                }
              };
              return (
                <div key={i} className="receta-ing-row">
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>en</span>
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
                  <div className="receta-ing-costo">
                    {(() => {
                      const costo = costoParcialIngrediente(ing);
                      return costo != null ? `Costo ingrediente: ${fmt(costo)}` : "Costo ingrediente: —";
                    })()}
                  </div>
                </div>
              );
            })}
            <button type="button" className="btn-dashed" onClick={addIng}>
              + Agregar ingrediente
            </button>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={onSave}
          disabled={saving || !form.nombre || !form.rinde || !masaPorcionadaValida}
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
        <div className="receta-cost-panel">
          <div className="stats-row" style={{ marginBottom: 0 }}>
            <div className="stat-card">
              <div className="stat-label">Costo total lote</div>
              <div className="stat-value">{fmt(costoTotal)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Costo por {unidadRinde}</div>
              <div className="stat-value accent">{rindeNum > 0 ? fmt(costoPorUnidad) : "—"}</div>
            </div>
            <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
              <div className="stat-label">Margen</div>
              <div className={`stat-value ${margenClass}`}>{margenText}</div>
            </div>
          </div>
        </div>
      )}

      {wizard === "extraer" && (
        <WizardExtraerMasa
          form={form}
          ingredientes={ingredientes}
          saving={saving}
          onClose={() => setWizard(null)}
          onApply={(result) => {
            onExtraerMasa(result);
            setWizard(null);
          }}
        />
      )}
      {wizard === "porciones" && editando && (
        <WizardPorciones
          masaBase={editando}
          saving={saving}
          onClose={() => setWizard(null)}
          onCreatePorciones={(payloads) => {
            onCreatePorciones(payloads);
            setWizard(null);
          }}
        />
      )}
      {wizard === "variante" && editando && (
        <WizardVariante
          producto={editando}
          ingredientes={ingredientes}
          onClose={() => setWizard(null)}
          onApply={(variante) => {
            onNuevaVariante(variante);
            setWizard(null);
          }}
        />
      )}
    </div>
  );
}

export { getTipoRecetaLabel };
