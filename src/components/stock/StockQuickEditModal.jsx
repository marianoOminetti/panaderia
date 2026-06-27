import { fmtStock } from "../../lib/format";
import { QuantityControl } from "../ui";

/**
 * Bottom sheet para cargar stock de un producto sin salir de la pantalla actual.
 */
export default function StockQuickEditModal({
  open,
  receta,
  stockActual,
  cantidad,
  setCantidad,
  contextHint,
  saving,
  onClose,
  onConfirm,
}) {
  if (!open || !receta) return null;

  return (
    <div
      className="modal-overlay"
      onClick={saving ? undefined : onClose}
      role="presentation"
    >
      <div
        className="modal stock-quick-edit-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="stock-quick-edit-title"
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={saving}
          aria-label="Cerrar"
        >
          ×
        </button>
        <div className="stock-quick-edit-header">
          <span className="stock-quick-edit-emoji">{receta.emoji || "🥐"}</span>
          <div>
            <div id="stock-quick-edit-title" className="modal-title" style={{ marginBottom: 4 }}>
              Cargar stock
            </div>
            <div className="stock-quick-edit-name">{receta.nombre}</div>
          </div>
        </div>

        {contextHint && (
          <p className="stock-quick-edit-hint">{contextHint}</p>
        )}

        <div className="stock-quick-edit-stats">
          <div>
            <div className="stock-quick-edit-stat-label">Stock actual</div>
            <div className="stock-quick-edit-stat-value">{fmtStock(stockActual)}</div>
          </div>
          <div>
            <div className="stock-quick-edit-stat-label">Después</div>
            <div className="stock-quick-edit-stat-value accent">
              {fmtStock(stockActual + (cantidad || 0))}
            </div>
          </div>
        </div>

        <div className="stock-quick-edit-qty">
          <span className="stock-quick-edit-stat-label">Cantidad a cargar</span>
          <QuantityControl
            value={cantidad}
            onChange={setCantidad}
            min={1}
            disabled={saving}
            size="lg"
            allowDecimals={false}
          />
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={onConfirm}
          disabled={saving || !cantidad || cantidad <= 0}
          style={{ width: "100%", marginTop: 16 }}
        >
          {saving ? "Cargando…" : `✓ Cargar +${cantidad || 0} u`}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onClose}
          disabled={saving}
          style={{ width: "100%", marginTop: 8 }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
