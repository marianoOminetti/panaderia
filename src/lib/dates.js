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

export function hoyLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

