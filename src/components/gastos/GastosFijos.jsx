/**
 * Pantalla Gastos: lista, resumen (diario/semanal/variable+puntual) y formulario.
 * Soporta tipo fijo, variable y puntual.
 */
import { useState } from "react";
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
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteMode, setDeleteMode] = useState("solo-futuro");
  const [deleteDesde, setDeleteDesde] = useState("");

  const {
    saveGastoFijo,
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

  const eliminar = (g) => {
    setDeleteModal(g);
    setDeleteMode("solo-futuro");
    setDeleteDesde("");
  };

  const confirmarEliminacion = async () => {
    if (!deleteModal) return;
    try {
      await deleteGastoFijo(deleteModal, {
        mode: deleteMode,
        desde: deleteDesde || null,
      });
      setDeleteModal(null);
    } catch (err) {
      reportError(err, { action: "deleteGastoFijo", id: deleteModal.id });
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
      const inicio = g.fecha_inicio_vigencia
        ? formatFecha(g.fecha_inicio_vigencia)
        : null;
      const fin = g.fecha_fin_vigencia ? formatFecha(g.fecha_fin_vigencia) : null;
      const vigencia =
        inicio && fin
          ? ` · Vigente ${inicio} a ${fin}`
          : inicio
            ? ` · Vigente desde ${inicio}`
            : "";
      return `${fmt(g.monto)} · ${freqLabel}${vigencia}`;
    }
    return `${fmt(g.monto)} · ${formatFecha(g.fecha)}`;
  };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const gastosVigentes = gastosOrdenados.filter((g) => {
    if (!g.fecha_fin_vigencia) return true;
    const fin = new Date(g.fecha_fin_vigencia);
    if (Number.isNaN(fin.getTime())) return true;
    // Si el gasto termina hoy (fin === hoy), ya lo consideramos pasado.
    return fin.getTime() > hoy.getTime();
  });
  const gastosHistoricos = gastosOrdenados.filter((g) => !gastosVigentes.includes(g));

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
        {gastosVigentes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <p>No configuraste gastos todavía.</p>
          </div>
        ) : (
          gastosVigentes.map((g) => (
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

      {gastosHistoricos.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">Lista de gastos pasados</span>
          </div>
          {gastosHistoricos.map((g) => (
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
              </div>
            </div>
          ))}
        </div>
      )}

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

      {deleteModal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setDeleteModal(null)}
            >
              ← Volver
            </button>
            <span className="screen-title">Eliminar gasto</span>
          </div>
          <div className="screen-content">
            <p className="page-subtitle">
              Elegí cómo querés que afecte a tus períodos al eliminar el gasto
              <strong> {deleteModal.nombre}</strong>.
            </p>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-content">
                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="radio"
                      name="delete-mode"
                      value="solo-futuro"
                      checked={deleteMode === "solo-futuro"}
                      onChange={() => setDeleteMode("solo-futuro")}
                      style={{ marginRight: 8 }}
                    />
                    Eliminar solo desde hoy en adelante
                  </label>
                  <p className="analytics-kpi-sub">
                    Los períodos históricos quedan como estaban. Este gasto deja
                    de contarse desde hoy y en los días futuros.
                  </p>
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">
                    <input
                      type="radio"
                      name="delete-mode"
                      value="historico"
                      checked={deleteMode === "historico"}
                      onChange={() => setDeleteMode("historico")}
                      style={{ marginRight: 8 }}
                    />
                    Eliminar también de períodos anteriores
                  </label>
                  <p className="analytics-kpi-sub">
                    Recalcularemos los períodos pasados donde estaba este gasto.
                  </p>
                  {deleteMode === "historico" && (
                    <div style={{ marginTop: 8 }}>
                      <DatePicker
                        label="Eliminar histórico desde"
                        value={deleteDesde}
                        onChange={setDeleteDesde}
                      />
                      <p
                        className="analytics-kpi-sub"
                        style={{ marginTop: 4, color: "var(--danger)" }}
                      >
                        ⚠ Esta acción va a cambiar tus números históricos para
                        esos períodos.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ backgroundColor: "var(--danger)", borderColor: "var(--danger)" }}
              onClick={confirmarEliminacion}
            >
              Confirmar eliminación
            </button>
            <button
              className="btn-secondary"
              onClick={() => setDeleteModal(null)}
              style={{ marginTop: 8 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
