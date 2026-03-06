/**
 * Voz para insumos: parseo de texto a compras (insumo, cantidad, precio).
 * Ej: "compré 2kg de harina de almendras a 43000 pesos". Usado por useInsumosCompra / InsumosCompra.
 */
export function parsearVozAComprasInsumos(texto, insumos) {
  if (!texto || !insumos?.length) return [];
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const txt = norm(texto).replace(/compr[eé]/g, "compre");
  const segmentos = txt
    .split(/[,y]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const matchInsumo = (nombreBuscado) => {
    const nb = norm(nombreBuscado);
    if (!nb) return null;
    let mejor = null;
    let mejorScore = 0;
    for (const ins of insumos) {
      const ni = norm(ins.nombre);
      if (!ni) continue;
      if (ni.includes(nb) || nb.includes(ni)) {
        const score = Math.min(ni.length, nb.length);
        if (score > mejorScore) {
          mejor = ins;
          mejorScore = score;
        }
      }
    }
    return mejor;
  };

  const parseNumero = (s) => {
    if (!s) return NaN;
    const n = parseFloat(String(s).replace(",", "."));
    return Number.isNaN(n) ? NaN : n;
  };

  const unidadesKg = ["kg", "kilo", "kilos"];
  const unidadesG = ["g", "gramo", "gramos"];
  const unidadesMl = ["ml", "mililitro", "mililitros"];
  const unidadesL = ["l", "litro", "litros"];
  const unidadesU = ["u", "unidad", "unidades"];

  const resultado = [];

  for (const seg of segmentos) {
    if (!seg) continue;
    const m = seg.match(
      /(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilos|g|gramos?|ml|mililitros?|l|litros?|u|unidad(?:es)?)?\s*(?:de)?\s+(.+)/
    );
    if (!m) continue;
    const cantidad = parseNumero(m[1]);
    if (!cantidad || cantidad <= 0) continue;
    const unidadFrase = (m[2] || "").trim();
    const resto = (m[3] || "").trim();

    let nombreParte = resto;
    let precioParte = "";
    const splitPrecio = resto.split(/\sa\s+/);
    if (splitPrecio.length >= 2) {
      nombreParte = splitPrecio[0].trim();
      precioParte = splitPrecio.slice(1).join(" a ").trim();
    }

    const insumo = matchInsumo(nombreParte);
    if (!insumo) continue;

    let precioPresentacion = null;
    if (precioParte) {
      const mPrecio = precioParte.match(
        /(\d+(?:[.,]\d+)?)\s*(?:peso|pesos|$)?/
      );
      if (mPrecio) {
        const p = parseNumero(mPrecio[1]);
        if (p && p > 0) precioPresentacion = p;
      }
    }

    const uFrase = (unidadFrase || "").toLowerCase();
    const uInsumo = (insumo.unidad || "g").toLowerCase();
    const cantPres = Number(insumo.cantidad_presentacion) || 1;

    let presentaciones = cantidad;
    const es = (lista) => lista.includes(uFrase);

    if (unidadFrase && cantPres > 0) {
      if (es(unidadesKg) && uInsumo === "g") {
        presentaciones = (cantidad * 1000) / cantPres;
      } else if (es(unidadesG) && uInsumo === "g") {
        presentaciones = cantidad / cantPres;
      } else if (es(unidadesL) && uInsumo === "ml") {
        presentaciones = (cantidad * 1000) / cantPres;
      } else if (es(unidadesMl) && uInsumo === "ml") {
        presentaciones = cantidad / cantPres;
      } else if (es(unidadesU) && uInsumo === "u") {
        presentaciones = cantidad / cantPres;
      } else {
        presentaciones = cantidad;
      }
      if (!Number.isFinite(presentaciones) || presentaciones <= 0) {
        return resultado;
      }
    }

    resultado.push({
      insumo,
      presentaciones,
      precioPresentacion,
    });
  }

  return resultado;
}
