import { formatCuitDisplay } from "./cuit";
import { getAfipCuitEmisor, resolveEmisorCuit } from "./afipQr";

/** Valores del negocio; override con REACT_APP_AFIP_* en Vercel. */
const DOMICILIO_DEFAULT = "San Carlos 266, La Banda";
const INICIO_ACTIVIDADES_DEFAULT = "11/25";

export function getEmisorDomicilioComercial() {
  const v = (process.env.REACT_APP_AFIP_DOMICILIO || "").trim();
  return v || DOMICILIO_DEFAULT;
}

export function getEmisorInicioActividades() {
  const v = (process.env.REACT_APP_AFIP_INICIO_ACTIVIDADES || "").trim();
  return v || INICIO_ACTIVIDADES_DEFAULT;
}

/** Datos fijos del emisor para la representación gráfica del comprobante (RG 1415 / 4291). */
export function resolveEmisorComprobante(factura) {
  const cuitRaw = resolveEmisorCuit(factura);
  return {
    cuit: cuitRaw,
    cuitDisplay: cuitRaw ? formatCuitDisplay(cuitRaw) : null,
    domicilioComercial: getEmisorDomicilioComercial(),
    inicioActividades: getEmisorInicioActividades(),
  };
}

export { getAfipCuitEmisor };
