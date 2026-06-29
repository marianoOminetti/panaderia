/**
 * Fechas: inicio de semana (lunes) en ISO, hoy en ISO local.
 * Usado por Analytics, Plan semanal, ventas por período, etc.
 */
export function getSemanaInicioISO(fecha = new Date()) {
  const d = new Date(fecha);
  const day = d.getDay(); // 0 domingo, 1 lunes, ...
  const diff = day === 0 ? 6 : day - 1; // lunes = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

/** Inicio de semana del plan semanal: sábado (sáb–vie). */
export function getPlanSemanaInicioISO(fecha = new Date()) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 dom, 6 sáb
  const diff = (day + 1) % 7; // días desde el sábado anterior (sáb = 0)
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

export function hoyLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Formatea YYYY-MM-DD para mostrar (evita desfase por timezone). */
export function formatFechaLocal(isoDate, options = {}) {
  const raw = String(isoDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isoDate || "Sin fecha";
  const [y, m, d] = raw.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString("es-AR", {
    weekday: options.weekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year:
      options.alwaysYear || y !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

/** Etiqueta relativa: Hoy, Ayer, Hace N días, o fecha corta. */
export function formatFechaRelativa(isoDate) {
  const raw = String(isoDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isoDate || "Sin fecha";
  const hoy = hoyLocalISO();
  if (raw === hoy) return "Hoy";
  const [hy, hm, hd] = hoy.split("-").map(Number);
  const ayerDate = new Date(hy, hm - 1, hd - 1);
  const ayer = `${ayerDate.getFullYear()}-${String(ayerDate.getMonth() + 1).padStart(2, "0")}-${String(ayerDate.getDate()).padStart(2, "0")}`;
  if (raw === ayer) return "Ayer";
  const [y, m, d] = raw.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const hoyDate = new Date(hy, hm - 1, hd);
  const diffDays = Math.round((hoyDate - target) / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays < 14) return `Hace ${diffDays} días`;
  return formatFechaLocal(raw);
}

