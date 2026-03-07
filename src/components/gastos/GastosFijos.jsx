/**
 * Pantalla Gastos: lista, resumen (diario/semanal/variable+puntual) y formulario.
 * Soporta tipo fijo, variable y puntual.
 */
import { fmt } from "../../lib/format";
import { reportError } from "../../utils/errorReport";
import { calcularGastosTotales } from "../../lib/gastosFijos";
import { useGastosFijos as useGastosFijosMutations } from "../../hooks/useGastosFijos";
import { useGastosFijosForm } from "../../hooks/useGastosFijosForm";
import { FormInput, FormMoneyInput, SearchableSelect, DatePicker } from "../ui";

const TIPO_LABEL = { fijo: "Fijo", variable: "Variable", puntual: "Puntual" };

const TIPOS_GASTO = [
  { value: "fijo", label: "Fijo (recurrente)" },
  { value: "variable", label: "Variable (facturas)" },
  { value: "puntual", label: "Puntual (una vez)" },
];

const FRECUENCIAS = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
];

const ESTADOS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

const formatFecha = (fecha) => {
  if (!fecha) return "";
  const d = new Date(fecha);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

export default function GastosFijos({ gastos, onRefresh, showToast }) {
  const {
    saveGastoFijo,
    toggleActivo: toggleActivoMutation,
    deleteGastoFijo,
  } = useGastosFijosMutations({ onRefresh, showToast });

  const formState = useGastosFijosForm({ showToast, saveGastoFijo });

  const { dia, semana, mes } = calcularGastosTotales(gastos, new Date());

  const gastosOrdenados = [...(gastos || [])].sort((a, b) => {
    const orderTipo = { fijo: 0, variable: 1, puntual: 2 };
    const ta = orderTipo[(a.tipo || "fijo").toLowerCase()] ?? 0;
    const tb = orderTipo[(b.tipo || "fijo").toLowerCase()] ?? 0;
    if (ta !== tb) return ta - tb;
    const cmp = (a.nombre || "").localeCompare(b.nombre || "", "es", {
      sensitivity: "base",
    });
    if (cmp !== 0) return cmp;
    const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
    const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return fb - fa;
  });

  const toggleActivo = async (g) => {
    try {
      await toggleActivoMutation(g);
    } catch (err) {
      reportError(err, { action: "toggleGastoFijo", id: g.id });
      showToast("⚠️ Error al actualizar");
    }
  };

  const eliminar = async (g) => {
    if (!window.confirm(`¿Eliminar el gasto "${g.nombre}"?`)) return;
    try {
      await deleteGastoFijo(g);
    } catch (err) {
      reportError(err, { action: "deleteGastoFijo", id: g.id });
      showToast("⚠️ Error al eliminar gasto");
    }
  };

  const renderDetalle = (g) => {
    const tipo = (g.tipo || "fijo").toLowerCase();
    if (tipo === "fijo") {
      const freqLabel =
        g.frecuencia === "diario"
          ? "Diario"
          : g.frecuencia === "semanal"
            ? "Semanal"
            : "Mensual";
      return `${fmt(g.monto)} · ${freqLabel} · ${g.activo ? "Activo" : "Inactivo"}`;
    }
    return `${fmt(g.monto)} · ${formatFecha(g.fecha)} · ${g.activo ? "Activo" : "Inactivo"}`;
  };

  return (
    <div className="content">
      <p className="page-title">Gastos</p>
      <p className="page-subtitle">
        Fijos (alquiler, sueldos), variables (luz, gas) y puntuales (arreglos)
      </p>

      <div className="stats-stack">
        <div className="stat-card">
          <div className="stat-label">Gasto recurrente diario</div>
          <div className="stat-value rojo">{fmt(dia || 0)}</div>
          <div className="analytics-kpi-sub">Prorrateo de gastos fijos</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gasto semanal total</div>
          <div className="stat-value rojo">{fmt(semana || 0)}</div>
          <div className="analytics-kpi-sub">Fijos + variable/puntual de la semana</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gasto mensual total</div>
          <div className="stat-value rojo">{fmt(mes || 0)}</div>
          <div className="analytics-kpi-sub">Fijos + variable/puntual del mes</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Lista de gastos</span>
          <button
            type="button"
            className="edit-btn"
            onClick={formState.openNew}
          >
            + Agregar
          </button>
        </div>
        {gastosOrdenados.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <p>No configuraste gastos todavía.</p>
          </div>
        ) : (
          gastosOrdenados.map((g) => (
            <div
              key={g.id}
              className="insumo-item"
              style={{ padding: "10px 0" }}
            >
              <div className="insumo-info" style={{ flex: 1 }}>
                <div className="insumo-nombre">
                  {g.nombre}
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      opacity: 0.8,
                      fontWeight: "normal",
                    }}
                  >
                    ({TIPO_LABEL[(g.tipo || "fijo").toLowerCase()] || g.tipo})
                  </span>
                </div>
                <div className="insumo-detalle">{renderDetalle(g)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  type="button"
                  className="edit-btn"
                  onClick={() => formState.openEdit(g)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="edit-btn"
                  onClick={() => toggleActivo(g)}
                  style={{
                    borderColor: g.activo
                      ? "var(--danger)"
                      : "var(--green)",
                    color: g.activo ? "var(--danger)" : "var(--green)",
                  }}
                >
                  {g.activo ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  className="edit-btn"
                  onClick={() => eliminar(g)}
                  style={{ color: "var(--danger)" }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="fab" onClick={formState.openNew}>
        +
      </button>

      {formState.modal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
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
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <SearchableSelect
                options={TIPOS_GASTO}
                value={formState.form.tipo}
                onChange={(v) => formState.setForm((f) => ({ ...f, tipo: v }))}
                placeholder="Seleccionar tipo"
              />
            </div>
            <FormInput
              label="Nombre"
              value={formState.form.nombre}
              onChange={(v) => formState.setForm((f) => ({ ...f, nombre: v }))}
              placeholder="Ej: Alquiler, Luz, Arreglo horno"
              required
            />
            <div className="form-row">
              <FormMoneyInput
                label="Monto"
                value={formState.form.monto}
                onChange={(v) => formState.setForm((f) => ({ ...f, monto: v }))}
                placeholder="300000"
                required
              />
              {formState.form.tipo === "fijo" ? (
                <div className="form-group">
                  <label className="form-label">Frecuencia</label>
                  <SearchableSelect
                    options={FRECUENCIAS}
                    value={formState.form.frecuencia}
                    onChange={(v) => formState.setForm((f) => ({ ...f, frecuencia: v }))}
                    placeholder="Frecuencia"
                  />
                </div>
              ) : (
                <DatePicker
                  label="Fecha"
                  value={formState.form.fecha}
                  onChange={(v) => formState.setForm((f) => ({ ...f, fecha: v }))}
                />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <SearchableSelect
                options={ESTADOS}
                value={formState.form.activo ? "activo" : "inactivo"}
                onChange={(v) => formState.setForm((f) => ({ ...f, activo: v === "activo" }))}
                placeholder="Estado"
              />
            </div>
            <button
              className="btn-primary"
              onClick={formState.save}
              disabled={formState.saving}
            >
              {formState.saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              className="btn-secondary"
              onClick={formState.closeModal}
              disabled={formState.saving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
