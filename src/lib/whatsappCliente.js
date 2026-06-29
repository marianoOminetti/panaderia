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

export function mensajeGenericoCliente({ nombre }) {
  const first = (nombre || "").trim().split(/\s+/)[0] || "Hola";
  return `Hola ${first}, te escribo desde Panadería SG. ¿En qué te puedo ayudar?`;
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

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function openUrl(href) {
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function abrirWhatsAppCliente(telefono, mensaje) {
  const num = normalizarTelefonoWhatsApp(telefono);
  if (!num || typeof window === "undefined") return false;

  const text = mensaje ? `&text=${encodeURIComponent(mensaje)}` : "";

  if (isIOS()) {
    try {
      openUrl(`whatsapp://send?phone=${num}${text}`);
      return true;
    } catch {
      // intentar wa.me abajo
    }
  }

  const href = urlWhatsApp(telefono, mensaje);
  if (!href) return false;

  try {
    openUrl(href);
    return true;
  } catch {
    return false;
  }
}

export async function copiarTelefonoCliente(telefono) {
  if (!telefono || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(String(telefono).trim());
    return true;
  } catch {
    return false;
  }
}
