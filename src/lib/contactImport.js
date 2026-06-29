/**
 * Pegar contacto en iOS: solo vCard (copiado desde Contactos).
 */
import { normalizarTelefonoWhatsApp } from "./whatsappCliente";

export function isContactPickerAvailable() {
  return typeof navigator !== "undefined" && !!navigator.contacts?.select;
}

/** Clave de dedup: formato wa.me si es posible, sino dígitos. */
export function normalizeTelefonoForDedup(telefono) {
  if (!telefono) return "";
  const wa = normalizarTelefonoWhatsApp(telefono);
  if (wa) return wa;
  const digits = String(telefono).replace(/\D/g, "");
  return digits || String(telefono).trim();
}

export function telefonosEquivalentes(a, b) {
  const na = normalizeTelefonoForDedup(a);
  const nb = normalizeTelefonoForDedup(b);
  if (!na || !nb) return false;
  return na === nb;
}

export function findClienteByTelefono(clientes, telefono) {
  const norm = normalizeTelefonoForDedup(telefono);
  if (!norm) return null;
  return (
    (clientes || []).find((c) =>
      telefonosEquivalentes(c.telefono, telefono),
    ) || null
  );
}

export function isVCardText(text) {
  return Boolean(text?.trim() && /BEGIN:VCARD/i.test(text));
}

function unfoldVCard(text) {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "");
}

function unwrapVCardValue(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .trim();
}

/** Un contacto desde texto vCard (un bloque BEGIN…END). */
export function parseVCard(text) {
  if (!isVCardText(text)) return null;

  const unfolded = unfoldVCard(text);

  const fn =
    unfolded.match(/^FN[^:]*:(.+)$/im)?.[1] ||
    unfolded
      .match(/^N[^:]*:(.+)$/im)?.[1]
      ?.split(";")
      .filter(Boolean)
      .reverse()
      .join(" ");

  const telLines = [...unfolded.matchAll(/^TEL[^:]*:(.+)$/gim)].map((m) =>
    unwrapVCardValue(m[1]),
  );
  const telefono =
    telLines.find((t) => t.replace(/\D/g, "").length >= 8) || telLines[0] || "";

  const nombre = unwrapVCardValue(fn || "");
  if (!nombre && !telefono) return null;

  return {
    nombre: nombre || "",
    telefono: telefono || "",
  };
}

/** Pegar portapapeles: solo acepta vCard. */
export function parsePastedVCard(text) {
  return parseVCard(text);
}

/** Portapapeles programático: solo HTTPS o localhost (no http://192.168.x.x). */
export function isClipboardApiAvailable() {
  if (typeof window === "undefined") return false;
  return Boolean(navigator.clipboard?.readText && window.isSecureContext);
}
