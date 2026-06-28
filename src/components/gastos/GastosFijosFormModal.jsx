import { FormInput, FormMoneyInput, SearchableSelect, DatePicker } from "../ui";
import { FRECUENCIAS, TIPOS_GASTO } from "./gastosFijosConstants";

export default function GastosFijosFormModal({
  formState,
  onEliminar,
}) {
  if (!formState.modal) return null;

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button
          type="button"
          className="screen-back"
          onClick={formState.closeModal}
          disabled={formState.saving}
        >
          ← Volver
        </button>
        <span className="screen-title">
          {formState.editando ? "Editar gasto" : "Nuevo gasto"}
        </span>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Datos del gasto</span>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <SearchableSelect
                options={TIPOS_GASTO}
                value={formState.form.tipo}
                onChange={(v) =>
                  formState.setForm((f) => ({ ...f, tipo: v }))
                }
                placeholder="Seleccionar tipo"
              />
            </div>
            <FormInput
              label="Nombre"
              value={formState.form.nombre}
              onChange={(v) =>
                formState.setForm((f) => ({ ...f, nombre: v }))
              }
              placeholder="Ej: Alquiler, Luz, Arreglo horno"
              required
            />
            <FormMoneyInput
              label="Monto"
              value={formState.form.monto}
              onChange={(v) =>
                formState.setForm((f) => ({ ...f, monto: v }))
              }
              placeholder="300000"
              required
            />
          </div>
        </div>

        {formState.form.tipo === "fijo" && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">Configuración del gasto fijo</span>
            </div>
            <div className="card-content">
              <p className="analytics-kpi-sub" style={{ marginBottom: 12 }}>
                Definí cómo se distribuye y desde cuándo aplica este gasto
                recurrente.
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Frecuencia</label>
                  <SearchableSelect
                    options={FRECUENCIAS}
                    value={formState.form.frecuencia}
                    onChange={(v) =>
                      formState.setForm((f) => ({ ...f, frecuencia: v }))
                    }
                    placeholder="Frecuencia"
                  />
                </div>
              </div>
              <DatePicker
                label="Inicio vigencia"
                value={formState.form.fechaInicioVigencia}
                onChange={(v) =>
                  formState.setForm((f) => ({
                    ...f,
                    fechaInicioVigencia: v,
                  }))
                }
              />
              <DatePicker
                label="Fin vigencia (opcional)"
                value={formState.form.fechaFinVigencia}
                onChange={(v) =>
                  formState.setForm((f) => ({ ...f, fechaFinVigencia: v }))
                }
              />
              <p className="analytics-kpi-sub" style={{ marginTop: 4 }}>
                Desde esa fecha deja de contarse en Gastos y Analytics (el
                último día que cuenta es el anterior).
              </p>
            </div>
          </div>
        )}

        {(formState.form.tipo === "variable" ||
          formState.form.tipo === "puntual") && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">Fecha del gasto</span>
            </div>
            <div className="card-content">
              <DatePicker
                label="Fecha"
                value={formState.form.fecha}
                onChange={(v) =>
                  formState.setForm((f) => ({ ...f, fecha: v }))
                }
              />
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          onClick={formState.save}
          disabled={formState.saving}
        >
          {formState.saving ? "Guardando…" : "Guardar"}
        </button>
        {formState.editando && (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => formState.openDuplicate(formState.editando)}
              disabled={formState.saving}
            >
              Duplicar gasto
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => onEliminar(formState.editando)}
              disabled={formState.saving}
            >
              Eliminar gasto
            </button>
          </>
        )}
        <button
          type="button"
          className="btn-secondary"
          onClick={formState.closeModal}
          disabled={formState.saving}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
