/**
 * Modal para crear o editar un insumo.
 */
import { CATEGORIAS } from "../../config/appConfig";
import { FormInput, FormMoneyInput, SearchableSelect } from "../ui";

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
  const categoriasOpts = CATEGORIAS.map((c) => ({ value: c, label: c }));

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
          <SearchableSelect
            options={categoriasOpts}
            value={form.categoria}
            onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
            placeholder="Seleccionar categoría"
          />
        </div>
        <div className="form-row">
          <FormMoneyInput
            label="Precio"
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
