export const fmt = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

export const pctFmt = (n) => `${Math.round(n * 100)}%`;

