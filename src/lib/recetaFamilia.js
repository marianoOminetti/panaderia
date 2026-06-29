export function collectFamilias(recetas = []) {
  const set = new Set();
  for (const r of recetas) {
    const f = (r.familia || "").trim();
    if (f) set.add(f);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

export function groupProductosPorFamilia(productos = []) {
  const grupos = new Map();
  for (const r of productos) {
    const key = (r.familia || "").trim() || "__sin_familia__";
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(r);
  }
  const sorted = [...grupos.entries()].sort(([a], [b]) => {
    if (a === "__sin_familia__") return 1;
    if (b === "__sin_familia__") return -1;
    return a.localeCompare(b, "es", { sensitivity: "base" });
  });
  return sorted.map(([key, items]) => ({
    familia: key === "__sin_familia__" ? null : key,
    items: items.sort((a, b) =>
      (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }),
    ),
  }));
}
