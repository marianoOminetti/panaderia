import { useState } from "react";
import { fmt } from "../../lib/format";
import { reportError } from "../../utils/errorReport";
import { useGastosFijos as useGastosFijosMutations } from "../../hooks/useGastosFijos";

/** Normaliza gastos fijos a valores diarios y semanales */
export function calcularGastosFijosNormalizados(gastos) {
  let dia = 0;
  let semana = 0;
  for (const g of gastos || []) {
    if (g.activo === false) continue;
    const monto = Number(g.monto) || 0;
    if (!monto) continue;
    const freq = (g.frecuencia || "").toLowerCase();
    if (freq === "diario") {
      dia += monto;
      semana += monto * 7;
    } else if (freq === "semanal") {
      semana += monto;
      dia += monto / 7;
    } else if (freq === "mensual") {
      const porDia = monto / 30; // aproximación simple
      dia += porDia;
      semana += porDia * 7;
    }
  }
  return { dia, semana };
}

export default function GastosFijos({ gastos, onRefresh, showToast }) {
  const { saveGastoFijo, toggleActivo: toggleActivoMutation, deleteGastoFijo } =
    useGastosFijosMutations({ onRefresh, showToast });

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    monto: "",
    frecuencia: "mensual",
    activo: true,
  });

  const openNew = () => {
    setEditando(null);
    setForm({ nombre: "", monto: "", frecuencia: "mensual", activo: true });
    setModal(true);
  };

  const openEdit = (g) => {
    setEditando(g);
    setForm({
      nombre: g.nombre,
      monto: String(g.monto ?? ""),
      frecuencia: g.frecuencia || "mensual",
      activo: g.activo !== false,
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.nombre.trim()) {
      showToast("⚠️ Nombre requerido");
      return;
    }
    const monto = parseFloat(String(form.monto).replace(",", "."));
    if (!monto || monto <= 0) {
      showToast("⚠️ Monto inválido");
      return;
    }
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      monto,
      frecuencia: form.frecuencia,
      activo: form.activo,
    };
    try {
      await saveGastoFijo(payload, editando?.id);
      setModal(false);
    } catch (err) {
      reportError(err, { action: "saveGastoFijo" });
      showToast("⚠️ Error al guardar gasto fijo");
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (g) => {
    try {
      await toggleActivoMutation(g);
    } catch (err) {
      reportError(err, { action: "toggleGastoFijo", id: g.id });
      showToast("⚠️ Error al actualizar");
    }
  };

  const eliminar = async (g) => {
    if (!window.confirm(`¿Eliminar el gasto fijo "${g.nombre}"?`)) return;
    try {
      await deleteGastoFijo(g);
    } catch (err) {
      reportError(err, { action: "deleteGastoFijo", id: g.id });
      showToast("⚠️ Error al eliminar gasto fijo");
    }
  };

  const { dia, semana } = calcularGastosFijosNormalizados(gastos);

  const gastosOrdenados = [...(gastos || [])].sort((a, b) =>
    (a.nombre || "").localeCompare(b.nombre || "", "es", {
      sensitivity: "base",
    })
  );

  return (
    <div className="content">
      <p className="page-title">Gastos fijos</p>
      <p className="page-subtitle">
        Alquiler, servicios, sueldos · se prorratean para ver la ganancia neta
      </p>

      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Gasto fijo diario</div>
          <div className="stat-value rojo">{fmt(dia || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gasto fijo semanal</div>
          <div className="stat-value rojo">{fmt(semana || 0)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Lista de gastos fijos</span>
          <button
            type="button"
            className="edit-btn"
            onClick={openNew}
          >
            + Agregar
          </button>
        </div>
        {gastosOrdenados.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <p>No configuraste gastos fijos todavía.</p>
          </div>
        ) : (
          gastosOrdenados.map((g) => {
            const freqLabel =
              g.frecuencia === "diario"
                ? "Diario"
                : g.frecuencia === "semanal"
                ? "Semanal"
                : "Mensual";
            return (
              <div
                key={g.id}
                className="insumo-item"
                style={{ padding: "10px 0" }}
              >
                <div className="insumo-info" style={{ flex: 1 }}>
                  <div className="insumo-nombre">{g.nombre}</div>
                  <div className="insumo-detalle">
                    {fmt(g.monto)} · {freqLabel} ·{" "}
                    {g.activo ? "Activo" : "Inactivo"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => openEdit(g)}
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
            );
          })
        )}
      </div>

      <button className="fab" onClick={openNew}>
        +
      </button>

      {modal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setModal(false)}
              disabled={saving}
            >
              ← Volver
            </button>
            <span className="screen-title">
              {editando ? "Editar gasto fijo" : "Nuevo gasto fijo"}
            </span>
          </div>
          <div className="screen-content">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                className="form-input"
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="Ej: Alquiler, Luz, Sueldos"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Monto</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, monto: e.target.value }))
                  }
                  placeholder="Ej: 300000"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Frecuencia</label>
                <select
                  className="form-select"
                  value={form.frecuencia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, frecuencia: e.target.value }))
                  }
                >
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={form.activo ? "activo" : "inactivo"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    activo: e.target.value === "activo",
                  }))
                }
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <button
              className="btn-primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setModal(false)}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
