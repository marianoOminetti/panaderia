import { useMemo } from "react";
import { detectAfipDocumento } from "../../lib/afipDocumento";
import { FormCheckbox, FormInput } from "../ui";

/**
 * Checkbox «Registrar en AFIP» + panel opcional CUIT/DNI / razón social.
 */
export default function AfipReceptorFields({
  showAfip = true,
  registrarEnAfip,
  setRegistrarEnAfip,
  datosFiscalesAfip = { documento: "", razon_social: "" },
  setDatosFiscalesAfip,
  clienteId = null,
  facturaEstado = null,
  puedeRegistrar = true,
  disabled = false,
}) {
  const documento =
    datosFiscalesAfip.documento ?? datosFiscalesAfip.cuit ?? "";
  const deteccion = useMemo(
    () => detectAfipDocumento(documento),
    [documento],
  );

  if (!showAfip) return null;

  const yaRegistrada =
    facturaEstado === "autorizada" || facturaEstado === "mock";
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  if (!puedeRegistrar && facturaEstado === "error") {
    return (
      <p className="form-hint" style={{ marginTop: 12, color: "var(--danger)" }}>
        Error al registrar en AFIP. Reintentá desde la lista con el botón AFIP.
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
            label="Razón social / nombre"
            value={datosFiscalesAfip.razon_social}
            onChange={(v) =>
              setDatosFiscalesAfip((prev) => ({ ...prev, razon_social: v }))
            }
            placeholder="Ej: Juan Pérez"
            disabled={disabled}
          />
          <FormInput
            label="CUIT o DNI"
            value={documento}
            onChange={(v) =>
              setDatosFiscalesAfip((prev) => ({
                ...prev,
                documento: v.replace(/\D/g, "").slice(0, 11),
                cuit: undefined,
              }))
            }
            placeholder="11 dígitos CUIT o 7–8 DNI"
            inputMode="numeric"
            disabled={disabled}
          />
          {deteccion.ok && deteccion.etiqueta && (
            <p className="form-hint" style={{ marginTop: -4, color: "var(--green)" }}>
              Detectado: {deteccion.etiqueta}
            </p>
          )}
          {!deteccion.ok && documento.length > 0 && (
            <p className="form-hint" style={{ marginTop: -4, color: "var(--danger)" }}>
              {deteccion.error}
            </p>
          )}
          <p className="form-hint" style={{ marginBottom: 0 }}>
            Vacío = consumidor final. Con 7–8 dígitos se toma como DNI; con 11 y
            dígito verificador válido, como CUIT.
            {clienteId
              ? " Se guarda en la ficha del cliente para la próxima vez."
              : ""}
          </p>
        </div>
      )}
    </>
  );
}
