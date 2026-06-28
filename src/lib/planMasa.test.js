import {
  calcularMasasDesdeProductos,
  calcularMasasNecesarias,
  clasificarMasasCalculadas,
  consumoMasaPorUnidadProducto,
  consumoMasaPorUnidadMasa,
  evaluarCoberturaMasas,
  getProductosDeMasa,
  getHijosDeMasa,
  formatCantidadMasaPlan,
  gramosDesdeLotesMasa,
  lotesDesdeGramosMasa,
} from "./planMasa";
import { sumPorDia } from "./planSugerencias";

describe("planMasa", () => {
  const recetas = [
    { id: "m1", nombre: "Masa chipa", es_precursora: true, rinde: 1, gramos_por_unidad: 100 },
    { id: "p1", nombre: "Chipa", es_precursora: false, rinde: 10 },
    { id: "p2", nombre: "Pan", es_precursora: false, rinde: 1 },
  ];
  const recetaIngredientes = [
    { receta_id: "p1", receta_id_precursora: "m1", cantidad: 200, unidad: "g" },
    { receta_id: "p2", receta_id_precursora: "m1", cantidad: 1, unidad: "u" },
  ];

  test("getProductosDeMasa devuelve hijos", () => {
    const hijos = getProductosDeMasa("m1", recetaIngredientes, recetas);
    expect(hijos.map((r) => r.id).sort()).toEqual(["p1", "p2"]);
  });

  test("consumoMasaPorUnidadProducto convierte gramos", () => {
    expect(
      consumoMasaPorUnidadProducto("p1", "m1", recetaIngredientes, recetas),
    ).toBeCloseTo(0.2);
  });

  test("calcularMasasDesdeProductos suma por día", () => {
    const items = [
      { receta: recetas[1], cantidad: 10, porDia: [10, 0, 0, 0, 0, 0, 0] },
    ];
    const masas = calcularMasasDesdeProductos(items, recetaIngredientes, recetas);
    expect(masas).toHaveLength(1);
    expect(masas[0].receta.id).toBe("m1");
    expect(sumPorDia(masas[0].porDia)).toBeGreaterThan(0);
  });

  test("evaluarCoberturaMasas detecta faltante en gramos", () => {
    const cart = [
      { receta: recetas[1], cantidad: 10, porDia: [10, 0, 0, 0, 0, 0, 0] },
      { receta: recetas[0], cantidad: 1, porDia: [1, 0, 0, 0, 0, 0, 0] },
    ];
    const r = evaluarCoberturaMasas(cart, recetaIngredientes, recetas);
    expect(r.ok).toBe(false);
    expect(r.alertas.length).toBeGreaterThan(0);
    expect(r.alertas[0].unidad).toBe("g");
    expect(r.alertas[0].faltanteTotal).toBeGreaterThan(0);
  });

  test("formatCantidadMasaPlan convierte lotes a gramos", () => {
    const masa = { es_precursora: true, gramos_por_unidad: 350, unidad_rinde: "u" };
    expect(formatCantidadMasaPlan(masa, 1)).toEqual({ valor: 350, unidad: "g" });
    expect(lotesDesdeGramosMasa(masa, 350)).toBe(1);
    expect(gramosDesdeLotesMasa(masa, 1)).toBe(350);
  });

  describe("cadena masa→masa→producto", () => {
    const recetasChain = [
      { id: "ms", nombre: "Masa Sablée", es_precursora: true, rinde: 1, gramos_por_unidad: 1000, unidad_rinde: "g" },
      { id: "ms45", nombre: "Masa 45g", es_precursora: true, rinde: 1, gramos_por_unidad: 45 },
      { id: "pf", nombre: "Pastafrola", es_precursora: false, rinde: 1 },
    ];
    const ingsChain = [
      { receta_id: "ms45", receta_id_precursora: "ms", cantidad: 45, unidad: "g" },
      { receta_id: "pf", receta_id_precursora: "ms45", cantidad: 1, unidad: "u" },
    ];

    test("calcularMasasNecesarias incluye porcionada y base", () => {
      const items = [{ receta: recetasChain[2], cantidad: 10, porDia: [10, 0, 0, 0, 0, 0, 0] }];
      const masas = calcularMasasNecesarias(items, ingsChain, recetasChain);
      const ids = masas.map((m) => m.receta.id).sort();
      expect(ids).toEqual(["ms", "ms45"]);
      expect(masas.find((m) => m.receta.id === "ms45").cantidad).toBeCloseTo(10);
    });

    test("consumoMasaPorUnidadMasa enlaza porcionada→base", () => {
      expect(consumoMasaPorUnidadMasa("ms45", "ms", ingsChain, recetasChain)).toBeCloseTo(0.045);
    });

    test("getHijosDeMasa incluye masas y productos", () => {
      const hijosMs = getHijosDeMasa("ms", ingsChain, recetasChain).map((r) => r.id);
      expect(hijosMs).toEqual(["ms45"]);
      const hijos45 = getHijosDeMasa("ms45", ingsChain, recetasChain).map((r) => r.id);
      expect(hijos45).toEqual(["pf"]);
    });

    test("clasificarMasasCalculadas separa base y porcionadas", () => {
      const items = [{ receta: recetasChain[2], cantidad: 5, porDia: [5, 0, 0, 0, 0, 0, 0] }];
      const masas = calcularMasasNecesarias(items, ingsChain, recetasChain);
      const { base, porcionadas } = clasificarMasasCalculadas(masas, ingsChain);
      expect(base.map((m) => m.receta.id)).toEqual(["ms"]);
      expect(porcionadas.map((m) => m.receta.id)).toEqual(["ms45"]);
    });
  });
});
