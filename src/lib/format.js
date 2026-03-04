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

export const pctFmt = (n) => `${Math.round(n * 100)}%`;

