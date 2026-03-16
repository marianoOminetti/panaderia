/**
 * Modal para crear o editar un insumo.
 */
import { CATEGORIAS } from "../../config/appConfig";
import { FormInput, FormMoneyInput, SearchableCategoria, SearchableSelect } from "../ui";

const UNIDADES = [
  { value: "g", label: "g (gramos)" },
  { value: "ml", label: "ml (mililitros)" },
  { value: "u", label: "u (unidades)" },
  { value: "kg", label: "kg (kilos)" },
  { value: "l", label: "l (litros)" },
];

export default function InsumosFormModal({
  form,
  setForm,
  editando,
  saving,
  save,
  onClose,
}) {
  const cantidadNum = Number(form.cantidad_presentacion) || 0;
  const precioNum = Number(form.precio) || 0;
  const tieneUnidadValida = !!form.unidad;
  const puedeCalcularPrecioUnitario = precioNum > 0 && cantidadNum > 0 && tieneUnidadValida;
  const precioUnitario =
    puedeCalcularPrecioUnitario && cantidadNum > 0 ? precioNum / cantidadNum : null;

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onClose}>
          ← Volver
        </button>
        <span className="screen-title">
          {editando ? "Editar insumo" : "Nuevo insumo"}
        </span>
      </div>
      <div className="screen-content">
        <FormInput
          label="Nombre"
          value={form.nombre}
          onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}
          placeholder="Ej: Harina de almendras"
          required
          autoFocus
        />
        <div className="form-group">
          <label className="form-label">Categoría</label>
          <SearchableCategoria
            categorias={CATEGORIAS}
            value={form.categoria}
            onChange={(categoria) =>
              setForm((f) => ({
                ...f,
                categoria,
              }))
            }
            placeholder="Seleccionar categoría"
          />
        </div>
        <div className="form-row">
          <FormMoneyInput
            label="Precio de la presentación"
            value={form.precio}
            onChange={(v) => setForm((f) => ({ ...f, precio: v }))}
            placeholder="4500"
            required
          />
          <FormInput
            label="Presentación"
            value={form.presentacion}
            onChange={(v) => setForm((f) => ({ ...f, presentacion: v }))}
            placeholder="x 30 u"
          />
        </div>
        <div className="form-row">
          <FormInput
            label="Cantidad"
            type="number"
            value={form.cantidad_presentacion}
            onChange={(v) => setForm((f) => ({ ...f, cantidad_presentacion: v }))}
            placeholder="30"
          />
          <div className="form-group">
            <label className="form-label">Unidad</label>
            <SearchableSelect
              options={UNIDADES}
              value={form.unidad}
              onChange={(v) => setForm((f) => ({ ...f, unidad: v }))}
              placeholder="Unidad"
            />
          </div>
        </div>
        {precioUnitario != null && (
          <p
            className="form-helper"
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 4,
              marginBottom: 12,
            }}
          >
            Precio unitario estimado: <strong>${precioUnitario.toFixed(2)}</strong>{" "}
            {form.unidad ? `por ${form.unidad}` : ""}
          </p>
        )}
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving || !form.nombre || !form.precio}
        >
          {saving
            ? "Guardando..."
            : editando
              ? "Guardar cambios"
              : "Agregar insumo"}
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
