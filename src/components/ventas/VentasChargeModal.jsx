/**
 * Modal de cobro: cliente, medio de pago, fecha, total editable.
 * Si fecha > hoy → guarda como pedido (misma UI, lógica diferente).
 */
import { fmtMonedaDecimal } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import { SelectorCliente, SelectoresPago } from "./VentasSelectors";
import VentasCart from "./VentasCart";
import PromosEnVentaPanel from "./PromosEnVentaPanel";
import { FormMoneyInput, FormInput, FormTextarea, DatePicker } from "../ui";
import AfipReceptorFields from "./AfipReceptorFields";

export default function VentasChargeModal({
  open,
  onClose,
  cartItems,
  cartTotal,
  cartPromos,
  promosExcluidasCobro,
  setPromosExcluidasCobro,
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
  allowPedidos = true,
  showAfip = true,
  registrarEnAfip,
  setRegistrarEnAfip,
  datosFiscalesAfip = { documento: "", razon_social: "" },
  setDatosFiscalesAfip,
  onClienteSelChange,
}) {
  if (!open) return null;

  const hoy = hoyLocalISO();
  const esPedido = allowPedidos && fechaEntrega && fechaEntrega > hoy;
  const descuentoPromo = cartPromos?.descuentoTotal ?? 0;
  const totalConPromo = cartPromos?.totalFinal ?? cartTotal;
  const promosEnCobro = cartPromos?.promosEnCobro ?? [];
  const hayPromosEnCarrito = !esPedido && promosEnCobro.length > 0;

  const handleRegistrar = () => {
    if (!allowPedidos && fechaEntrega && fechaEntrega > hoy) {
      showToast?.("Con este usuario solo se permiten ventas inmediatas.");
      return;
    }
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
          {hayPromosEnCarrito && (
            <PromosEnVentaPanel
              cartPromos={cartPromos}
              promosExcluidas={promosExcluidasCobro}
              setPromosExcluidas={setPromosExcluidasCobro}
            />
          )}
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
            {allowPedidos
              ? "Hoy = venta inmediata. Fecha futura = pedido."
              : "Con este usuario, solo se permiten ventas inmediatas."}
          </p>

          <SelectorCliente
            value={clienteSel}
            onChange={onClienteSelChange || setClienteSel}
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
                placeholder={fmtMonedaDecimal(totalConPromo).replace("$", "").trim()}
              />
              <p className="form-hint">
                Dejalo vacío para usar el total{descuentoPromo > 0 ? " con promos" : " del carrito"}.
                Usalo para descuentos extra o redondeos.
              </p>
              <AfipReceptorFields
                showAfip={showAfip}
                registrarEnAfip={registrarEnAfip}
                setRegistrarEnAfip={setRegistrarEnAfip}
                datosFiscalesAfip={datosFiscalesAfip}
                setDatosFiscalesAfip={setDatosFiscalesAfip}
                clienteId={clienteSel}
              />
            </>
          )}
        </div>

        <button
          className="btn-primary"
          onClick={handleRegistrar}
          disabled={cartItems.length === 0 || saving}
        >
          {saving
            ? "Registrando…"
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
