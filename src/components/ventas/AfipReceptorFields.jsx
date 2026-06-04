import { FormCheckbox, FormInput } from "../ui";

/**
 * Checkbox «Registrar en AFIP» + panel opcional CUIT / razón social.
 */
export default function AfipReceptorFields({
  showAfip = true,
  registrarEnAfip,
  setRegistrarEnAfip,
  datosFiscalesAfip = { cuit: "", razon_social: "" },
  setDatosFiscalesAfip,
  clienteId = null,
  facturaEstado = null,
  puedeRegistrar = true,
  disabled = false,
}) {
  if (!showAfip) return null;

  const yaRegistrada =
    facturaEstado === "autorizada" || facturaEstado === "mock";
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  if (!puedeRegistrar && facturaEstado === "error") {
    return (
      <p className="form-hint" style={{ marginTop: 12, color: "var(--danger)" }}>
        AFIP en estado de error con CAE o bloqueo. Revisá en la lista o contactá
        soporte antes de reintentar.
      </p>
    );
  }

  if (yaRegistrada) {
    return (
      <p
        className="form-hint"
        style={{ marginTop: 12, color: "var(--green)", fontWeight: 600 }}
      >
        {facturaEstado === "mock"
          ? "Ya registrada en AFIP (prueba)."
          : "Ya registrada en AFIP."}
      </p>
    );
  }

  return (
    <>
      <FormCheckbox
        label="Registrar en AFIP"
        checked={registrarEnAfip}
        onChange={setRegistrarEnAfip}
        disabled={disabled || !online}
      />
      {!online && (
        <p className="form-hint" style={{ marginTop: -8 }}>
          Sin conexión: no se puede registrar en AFIP.
        </p>
      )}
      {registrarEnAfip && setDatosFiscalesAfip && (
        <div
          className="afip-receptor-panel"
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            background: "var(--color-surface-muted, #f4f6f8)",
          }}
        >
          <p className="form-label" style={{ marginTop: 0, marginBottom: 10 }}>
            Datos en la factura (opcional)
          </p>
          <FormInput
            label="Razón social"
            value={datosFiscalesAfip.razon_social}
            onChange={(v) =>
              setDatosFiscalesAfip((prev) => ({ ...prev, razon_social: v }))
            }
            placeholder="Ej: Panadería del Norte SRL"
            disabled={disabled}
          />
          <FormInput
            label="CUIT"
            value={datosFiscalesAfip.cuit}
            onChange={(v) =>
              setDatosFiscalesAfip((prev) => ({
                ...prev,
                cuit: v.replace(/\D/g, "").slice(0, 11),
              }))
            }
            placeholder="11 dígitos"
            inputMode="numeric"
            disabled={disabled}
          />
          <p className="form-hint" style={{ marginBottom: 0 }}>
            Dejalo vacío para consumidor final. Si cargás CUIT, completá la razón
            social como figura en AFIP.
            {clienteId
              ? " Se guarda en la ficha del cliente para la próxima vez."
              : ""}
          </p>
        </div>
      )}
    </>
  );
}
