export const MESES =
  "Enero Febrero Marzo Abril Mayo Junio Julio Agosto Septiembre Octubre Noviembre Diciembre".split(
    " ",
  );
export const DIA_SEMANA = "Do Lu Ma Mi Ju Vi Sa".split(" ");

export function toISO(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

export function parseISO(iso) {
  if (!iso || iso.length < 10) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  return new Date(y, m - 1, d);
}

export function formatDisplay(iso) {
  const d = parseISO(iso);
  if (!d) return "";
  const day = d.getDate();
  const month = MESES[d.getMonth()].slice(0, 3);
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function buildCalendarCells(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days = last.getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}
