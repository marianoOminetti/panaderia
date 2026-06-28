import { DatePicker } from "../ui";

export default function GastosDeleteModal({
  gasto,
  deleteMode,
  deleteDesde,
  onDeleteModeChange,
  onDeleteDesdeChange,
  onConfirm,
  onCancel,
}) {
  if (!gasto) return null;

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button type="button" className="screen-back" onClick={onCancel}>
          ← Volver
        </button>
        <span className="screen-title">Eliminar gasto</span>
      </div>
      <div className="screen-content">
        <p className="page-subtitle">
          Elegí cómo querés que afecte a tus períodos al eliminar el gasto
          <strong> {gasto.nombre}</strong>.
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
                  onChange={() => onDeleteModeChange("solo-futuro")}
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
                  onChange={() => onDeleteModeChange("historico")}
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
                    onChange={onDeleteDesdeChange}
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
          type="button"
          className="btn-primary"
          style={{
            backgroundColor: "var(--danger)",
            borderColor: "var(--danger)",
          }}
          onClick={onConfirm}
        >
          Confirmar eliminación
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          style={{ marginTop: 8 }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
