import {
  FILTRO_OCULTAS,
  FILTRO_TIPO,
  filtrarRecetas,
  ingredienteConProblema,
  recetasConIngredientesIncompletos,
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

  test("lista recetas con ingredientes incompletos", () => {
    const ings = [{ receta_id: "2", costo_fijo: 100 }];
    const out = recetasConIngredientesIncompletos(recetas, ings, [], recetas);
    expect(out).toHaveLength(1);
    expect(out[0].receta.id).toBe("2");
  });
});
