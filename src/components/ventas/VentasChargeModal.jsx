import { fmt } from "../../lib/format";
import { SelectorCliente, SelectoresPago } from "./VentasSelectors";
import VentasCart from "./VentasCart";

export default function VentasChargeModal({
  open,
  onClose,
  cartItems,
  cartTotal,
  clienteSel,
  setClienteSel,
  medioPago,
  setMedioPago,
  estadoPago,
  setEstadoPago,
  chargeTotalOverride,
  setChargeTotalOverride,
  onRegistrar,
  saving,
  clientes,
  insertCliente,
  showToast,
}) {
  if (!open) return null;

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onClose}>
          ← Volver
        </button>
        <span className="screen-title">Cobro</span>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Resumen</span>
          </div>
          <VentasCart
            cartItems={cartItems}
            cartTotal={cartTotal}
            readOnly
          />
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <SelectorCliente
            value={clienteSel}
            onChange={setClienteSel}
            clientes={clientes}
            insertCliente={insertCliente}
            showToast={showToast}
          />
          <SelectoresPago
            medioPago={medioPago}
            setMedioPago={setMedioPago}
            estadoPago={estadoPago}
            setEstadoPago={setEstadoPago}
          />
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Total final (editable)</label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>💰</span>
              <input
                className="form-input"
                type="number"
                value={chargeTotalOverride}
                onChange={(e) => setChargeTotalOverride(e.target.value)}
                placeholder={fmt(cartTotal)}
                style={{ flex: 1 }}
              />
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              Dejalo vacío para usar el total del carrito. Usalo para
              descuentos o redondeos.
            </p>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={onRegistrar}
          disabled={saving || cartItems.length === 0}
        >
          {saving ? "Registrando..." : "Registrar venta"}
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
