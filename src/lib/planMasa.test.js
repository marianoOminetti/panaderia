import {
  calcularMasasDesdeProductos,
  consumoMasaPorUnidadProducto,
  evaluarCoberturaMasas,
  getProductosDeMasa,
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

  test("evaluarCoberturaMasas detecta faltante", () => {
    const cart = [
      { receta: recetas[1], cantidad: 10, porDia: [10, 0, 0, 0, 0, 0, 0] },
      { receta: recetas[0], cantidad: 1, porDia: [1, 0, 0, 0, 0, 0, 0] },
    ];
    const r = evaluarCoberturaMasas(cart, recetaIngredientes, recetas);
    expect(r.ok).toBe(false);
    expect(r.alertas.length).toBeGreaterThan(0);
    expect(r.alertas[0].faltanteTotal).toBeGreaterThan(0);
  });
});
