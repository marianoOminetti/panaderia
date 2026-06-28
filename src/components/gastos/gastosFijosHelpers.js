export const formatFecha = (fecha) => {
  if (!fecha) return "";
  const d = new Date(fecha);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

export const getTipo = (g) => (g.tipo || "fijo").toLowerCase();

export const vencePronto = (g) => {
  if (!g.fecha_fin_vigencia) return false;
  const fin = new Date(g.fecha_fin_vigencia);
  if (Number.isNaN(fin.getTime())) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + 30);
  return fin.getTime() > hoy.getTime() && fin.getTime() <= limite.getTime();
};

export const sortGastos = (items, porMonto) => {
  const sorted = [...items];
  if (porMonto) {
    sorted.sort((a, b) => (Number(b.monto) || 0) - (Number(a.monto) || 0));
    return sorted;
  }
  sorted.sort((a, b) => {
    const orderTipo = { fijo: 0, variable: 1, puntual: 2 };
    const ta = orderTipo[getTipo(a)] ?? 0;
    const tb = orderTipo[getTipo(b)] ?? 0;
    if (ta !== tb) return ta - tb;
    const cmp = (a.nombre || "").localeCompare(b.nombre || "", "es", {
      sensitivity: "base",
    });
    if (cmp !== 0) return cmp;
    const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
    const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return fb - fa;
  });
  return sorted;
};
