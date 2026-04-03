/**
 * Filtro por rango de fechas para la lista de Ventas (alineado a `fecha` o `created_at`).
 */

export function ventaFechaYYYYMMDD(v) {
  if (!v) return null;
  if (v.fecha && String(v.fecha).length >= 10) return String(v.fecha).slice(0, 10);
  if (v.created_at) {
    const s = String(v.created_at);
    if (s.length >= 10) return s.slice(0, 10);
  }
  return null;
}

/**
 * @param {Array} ventas
 * @param {string} desde YYYY-MM-DD
 * @param {string} hasta YYYY-MM-DD
 */
export function filtrarVentasPorFechaRango(ventas, desde, hasta) {
  if (!desde || !hasta) return ventas || [];
  return (ventas || []).filter((v) => {
    const d = ventaFechaYYYYMMDD(v);
    if (!d) return false;
    return d >= desde && d <= hasta;
  });
}
