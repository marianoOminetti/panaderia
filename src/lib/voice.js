/**
 * Voz para ventas: API de reconocimiento, parseo de texto a ítems (receta + cantidad).
 * Usado por useVentasVoz y VentasVoiceModal.
 */
export const SpeechRecognitionAPI =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

/** Parsea texto de voz a ventas: "2 panes lactales, 2 brownies" → [{ receta, cantidad }] */
export function parsearVozAVentas(texto, recetas) {
  if (!texto || !recetas?.length) return [];
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const NUMEROS_ES = {
    un: 1,
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
  };
  const separadores =
    /[,;]|\s+y\s+|\s+también\s+|\s+(?=\d+\s|uno\s|dos\s|tres\s|cuatro\s|cinco\s|seis\s|siete\s|ocho\s|nueve\s|diez\s|un\s)/i;
  const segmentos = texto
    .split(separadores)
    .map((s) => s.trim())
    .filter(Boolean);
  const resultado = [];

  const parsearCantidad = (t) => {
    const n = parseInt(t, 10);
    if (!Number.isNaN(n)) return n;
    return NUMEROS_ES[t.toLowerCase()] ?? 1;
  };

  const matchReceta = (busqueda) => {
    const b = norm(busqueda);
    const palabras = b.split(/\s+/).filter(Boolean);
    let mejor = null;
    let mejorPuntos = 0;
    for (const r of recetas) {
      const rn = norm(r.nombre);
      let puntos = 0;
      for (const p of palabras) {
        const pSingular = p.replace(/es$/, "").replace(/s$/, "");
        if (
          rn.includes(p) ||
          rn.includes(pSingular) ||
          rn.split(/\s+/).some(
            (w) => w.startsWith(p) || w.startsWith(pSingular),
          )
        ) {
          puntos++;
        }
      }
      if (
        puntos > 0 &&
        puntos >= palabras.length * 0.4 &&
        puntos > mejorPuntos
      ) {
        mejorPuntos = puntos;
        mejor = r;
      }
    }
    if (!mejor) {
      for (const r of recetas) {
        if (norm(r.nombre).includes(b) || b.includes(norm(r.nombre))) return r;
      }
    }
    return mejor;
  };

  for (const seg of segmentos) {
    const numInicio = seg.match(
      /^(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|un)\s+/i,
    );
    const numFinal = seg.match(
      /\s+(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)$/i,
    );
    let cantidad = 1;
    let textoProd = seg;
    if (numInicio) {
      cantidad = parsearCantidad(numInicio[1]);
      textoProd = seg.slice(numInicio[0].length).trim();
    } else if (numFinal) {
      cantidad = parsearCantidad(numFinal[1]);
      textoProd = seg.slice(0, -numFinal[0].length).trim();
    }
    if (!textoProd) continue;
    const receta = matchReceta(textoProd);
    if (receta) resultado.push({ receta, cantidad });
  }
  return resultado;
}

