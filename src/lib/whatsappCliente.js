/**
 * Links de WhatsApp para retención de clientes.
 */

/** Normaliza teléfonos argentinos a formato wa.me (549XXXXXXXXXX). */
export function normalizarTelefonoWhatsApp(telefono) {
  if (!telefono) return "";
  let digits = String(telefono).replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("0")) digits = digits.slice(1);

  const mobile15 = digits.match(/^(\d{2,4})15(\d{6,8})$/);
  if (mobile15) digits = mobile15[1] + mobile15[2];

  if (digits.startsWith("54")) {
    if (digits.startsWith("549")) return digits;
    const sinPais = digits.slice(2);
    if (sinPais.length >= 10) return `549${sinPais}`;
    return digits;
  }

  if (digits.length >= 10) return `549${digits}`;

  return "";
}

export function mensajeRetencionCliente({
  nombre,
  diasDesdeUltima,
  favoritoNombre,
}) {
  const first = (nombre || "").trim().split(/\s+/)[0] || "Hola";
  let msg = `Hola ${first}, ¿cómo andás? Hace ${diasDesdeUltima ?? "varios"} días que no te vemos por acá.`;
  if (favoritoNombre) {
    msg += ` Esta semana tenemos ${favoritoNombre} — ¿querés que te separemos algo?`;
  } else {
    msg += " ¿Querés que te separemos algo para esta semana?";
  }
  return msg;
}

export function urlWhatsApp(telefono, mensaje) {
  const num = normalizarTelefonoWhatsApp(telefono);
  if (!num) return null;
  const text = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${num}${text}`;
}

export function abrirWhatsAppCliente(telefono, mensaje) {
  const href = urlWhatsApp(telefono, mensaje);
  if (!href || typeof window === "undefined") return false;
  window.open(href, "_blank", "noopener,noreferrer");
  return true;
}
