/**
 * Modal de cobro: cliente, medio de pago, fecha, total editable.
 * Si fecha > hoy → guarda como pedido (misma UI, lógica diferente).
 */
import { fmtMonedaDecimal } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import { SelectorCliente, SelectoresPago } from "./VentasSelectors";
import VentasCart from "./VentasCart";
import { FormMoneyInput, FormInput, FormTextarea, DatePicker } from "../ui";

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
  fechaEntrega,
  setFechaEntrega,
  senia,
  setSenia,
  horaEntrega,
  setHoraEntrega,
  notas,
  setNotas,
}) {
  if (!open) return null;

  const hoy = hoyLocalISO();
  const esPedido = fechaEntrega && fechaEntrega > hoy;

  const handleRegistrar = () => {
    if (esPedido && !clienteSel) {
      showToast?.("Para pedidos es obligatorio elegir un cliente");
      return;
    }
    onRegistrar();
  };

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
          <DatePicker
            label="Fecha de entrega"
            value={fechaEntrega}
            onChange={setFechaEntrega}
          />
          <p
            className="form-hint"
            style={{ marginTop: -8, marginBottom: 12 }}
          >
            Hoy = venta inmediata. Fecha futura = pedido.
          </p>

          <SelectorCliente
            value={clienteSel}
            onChange={setClienteSel}
            clientes={clientes}
            insertCliente={insertCliente}
            showToast={showToast}
            required={esPedido}
          />

          {esPedido ? (
            <>
              <FormMoneyInput
                label="Seña / adelanto (opcional)"
                value={senia}
                onChange={setSenia}
                placeholder="0"
              />
              <FormInput
                label="Hora aproximada de entrega (opcional)"
                value={horaEntrega}
                onChange={setHoraEntrega}
                placeholder="Ej: 10:00, mediodía, tarde"
              />
              <FormTextarea
                label="Notas (opcional)"
                value={notas}
                onChange={setNotas}
                placeholder="Ej: Sin crema, con cartel de feliz cumple"
                rows={2}
              />
            </>
          ) : (
            <>
              <SelectoresPago
                medioPago={medioPago}
                setMedioPago={setMedioPago}
                estadoPago={estadoPago}
                setEstadoPago={setEstadoPago}
              />
              <FormMoneyInput
                label="Total final (editable)"
                value={chargeTotalOverride}
                onChange={setChargeTotalOverride}
                placeholder={fmtMonedaDecimal(cartTotal).replace("$", "").trim()}
              />
              <p className="form-hint">
                Dejalo vacío para usar el total del carrito. Usalo para descuentos o redondeos.
              </p>
            </>
          )}
        </div>

        <button
          className="btn-primary"
          onClick={handleRegistrar}
          disabled={saving || cartItems.length === 0}
        >
          {saving
            ? "Registrando..."
            : esPedido
              ? "Guardar pedido"
              : "Registrar venta"}
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
