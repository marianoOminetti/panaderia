/**
 * Modal de detalle de insumo con composición y acciones.
 */
import { fmt, fmtStock } from "../../lib/format";
import InsumosComposicion from "./InsumosComposicion";

export default function InsumosDetalleModal({
  detalleInsumo,
  insumos,
  insumoStock,
  insumoComposicion,
  composicion,
  deleteInsumoComposicion,
  upsertInsumoComposicion,
  precioPorU,
  onActualizarPrecioPremezcla,
  onClose,
  onEdit,
  onDelete,
  confirm,
  showToast,
}) {
  if (!detalleInsumo) return null;
  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onClose}>
          ← Volver
        </button>
        <span className="screen-title">{detalleInsumo.nombre}</span>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Detalle</span>
            <button
              className="edit-btn"
              type="button"
              onClick={() => {
                onClose();
                onEdit(detalleInsumo);
              }}
            >
              ✏️ Editar insumo
            </button>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            <strong>Categoría:</strong> {detalleInsumo.categoria}
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            <strong>Presentación:</strong>{" "}
            {detalleInsumo.presentacion || "—"}
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            <strong>Precio:</strong>{" "}
            {fmt(detalleInsumo.precio || 0)} (
            {precioPorU(detalleInsumo)})
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            <strong>Stock:</strong>{" "}
            {fmtStock((insumoStock || {})[detalleInsumo.id] ?? 0)}{" "}
            {detalleInsumo.unidad || "g"}
          </p>
        </div>

        <InsumosComposicion
          detalleInsumo={detalleInsumo}
          insumos={insumos}
          insumoComposicion={insumoComposicion}
          compInsumoSel={composicion.compInsumoSel}
          setCompInsumoSel={composicion.setCompInsumoSel}
          compFactor={composicion.compFactor}
          setCompFactor={composicion.setCompFactor}
          compSaving={composicion.compSaving}
          setCompSaving={composicion.setCompSaving}
          onDeleteComposicion={deleteInsumoComposicion}
          onUpsertComposicion={upsertInsumoComposicion}
          onActualizarPrecioPremezcla={onActualizarPrecioPremezcla}
          confirm={confirm}
          showToast={showToast}
        />

        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
          Para registrar compras (ingresos), usá &quot;Registrar compra de stock&quot; arriba.
        </p>
        <button className="btn-danger" onClick={onDelete}>
          Eliminar insumo
        </button>
      </div>
    </div>
  );
}
