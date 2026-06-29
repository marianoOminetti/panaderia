import {
  FILTRO_OCULTAS,
  FILTRO_TIPO,
  filtrarRecetas,
  ingredienteConProblema,
  mensajeProblemaIngrediente,
  nombreEsCopiaDe,
  recetasParaRevisar,
} from "./recetaLista";

describe("recetaLista", () => {
  const recetas = [
    { id: "1", nombre: "Masa A", es_precursora: true, oculto_en_venta: true },
    { id: "2", nombre: "Empanada", es_precursora: false, oculto_en_venta: false, familia: "Empanada" },
    { id: "3", nombre: "Brownie", es_precursora: false, oculto_en_venta: true, familia: "Brownie" },
  ];

  test("filtra por tipo masa", () => {
    const out = filtrarRecetas(recetas, { tipo: FILTRO_TIPO.MASAS });
    expect(out.map((r) => r.id)).toEqual(["1"]);
  });

  test("filtra por ocultas", () => {
    const out = filtrarRecetas(recetas, { ocultas: FILTRO_OCULTAS.SOLO_OCULTAS });
    expect(out.map((r) => r.id).sort()).toEqual(["1", "3"]);
  });

  test("busca por nombre y familia", () => {
    expect(filtrarRecetas(recetas, { busqueda: "empanada" }).map((r) => r.id)).toEqual(["2"]);
    expect(filtrarRecetas(recetas, { busqueda: "brownie" }).map((r) => r.id)).toEqual(["3"]);
  });

  test("detecta costo fijo sin nombre", () => {
    expect(ingredienteConProblema({ costo_fijo: 240 }, [], [])).toBe("costo_fijo_sin_nombre");
    expect(ingredienteConProblema({ insumo_id: "x", cantidad: 1 }, [{ id: "x" }], [])).toBe(null);
  });

  test("detecta ingrediente huérfano tras borrar insumo/masa", () => {
    expect(ingredienteConProblema({ cantidad: 45, unidad: "g" }, [], [])).toBe("sin_asignar");
    expect(mensajeProblemaIngrediente({ cantidad: 45, unidad: "g" }, [], [])).toBe(
      "Ingrediente 45 g sin insumo/masa asignada",
    );
  });

  test("mensaje detalla monto de costo fijo", () => {
    expect(mensajeProblemaIngrediente({ costo_fijo: 600 }, [], [])).toMatch(/\$.*600/);
    expect(mensajeProblemaIngrediente({ costo_fijo: 600 }, [], [])).toMatch(/sin insumo\/masa/);
  });

  test("lista recetas con ingredientes incompletos", () => {
    const solo = [{ id: "2", nombre: "Empanada", es_precursora: false }];
    const ings = [{ receta_id: "2", costo_fijo: 100 }];
    const out = recetasParaRevisar(solo, ings, [], solo);
    expect(out).toHaveLength(1);
    expect(out[0].receta.id).toBe("2");
    expect(out[0].problemas[0]).toMatch(/\$.*100/);
  });

  test("detecta sin ingredientes", () => {
    const out = recetasParaRevisar([{ id: "9", nombre: "VACIA" }], [], [], []);
    expect(out).toHaveLength(1);
    expect(out[0].problemas).toContain("Sin ingredientes cargados");
  });

  test("detecta nombre duplicado exacto", () => {
    const dup = [
      { id: "a", nombre: "EMPANADA" },
      { id: "b", nombre: "EMPANADA" },
    ];
    const out = recetasParaRevisar(dup, [], [], dup);
    expect(out).toHaveLength(2);
    expect(out[0].problemas.some((p) => p.includes("Nombre duplicado"))).toBe(true);
    expect(out[1].problemas.some((p) => p.includes("Nombre duplicado"))).toBe(true);
  });

  test("detecta copia de sin renombrar", () => {
    expect(nombreEsCopiaDe("Copia de Brownie")).toBe(true);
    expect(nombreEsCopiaDe("COPIA DE BROWNIE")).toBe(true);
    const out = recetasParaRevisar([{ id: "c", nombre: "COPIA DE BROWNIE" }], [], [], []);
    expect(out[0].problemas).toContain("Nombre sin renombrar (Copia de…)");
  });
});
