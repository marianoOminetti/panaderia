/**
 * Formateo de números y precios: parseDecimal (entrada usuario), fmt/fmtPrecio/fmtDecimal/fmtStock/fmtMonedaDecimal.
 * Usado por Ventas, Stock, Insumos, Recetas, Analytics, etc.
 */
export const fmt = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

/** Precio para carrito: sin decimales cuando >= 100, sino 1 decimal */
export const fmtPrecio = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return fmt(0);
  const digits = num >= 100 ? 0 : 1;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(num);
};

/** Precio/cantidad con hasta 2 decimales (carrito, edición). */
export const fmtDecimal = (n, maxDecimals = 2) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(num);
};

/** Stock: máximo 2 decimales para evitar 0.400000000035 por flotantes. */
export const fmtStock = (n) => fmtDecimal(Number(n), 2);

/** Moneda con hasta 2 decimales para carrito (precio unitario, subtotales). */
export const fmtMonedaDecimal = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return fmt(0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export const pctFmt = (n) => `${Math.round(n * 100)}%`;

/** Parsea cantidad (número o string con coma/punto) para carrito y edición. */
export function toCantidadNumber(value) {
  if (typeof value === "number") return value;
  const text = String(value ?? "").trim().replace(",", ".");
  const num = parseFloat(text);
  return Number.isFinite(num) ? num : 0;
}

/** Parseo robusto de decimales que acepta coma o punto. Devuelve null si no es número válido. Usado en recetas/formularios. */
export function parseDecimal(value) {
  if (value == null) return null;
  const text = String(value).trim().replace(",", ".");
  if (text === "") return null;
  const num = parseFloat(text);
  return Number.isNaN(num) ? null : num;
}

