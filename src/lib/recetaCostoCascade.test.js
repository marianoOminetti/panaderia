import { costosParaRecetaYCadena, recetasDependientesDe } from "./recetaCostoCascade";

const insumos = [{ id: "harina", nombre: "Harina", precio: 1000, cantidad_presentacion: 1000, unidad: "g" }];

describe("recetaCostoCascade", () => {
  test("propaga costos en cadena Sablée → 45g → producto", () => {
    const recetas = [
      { id: "ms", nombre: "Masa Sablée", rinde: 1, es_precursora: true, gramos_por_unidad: 1000 },
      { id: "ms45", nombre: "Masa 45g", rinde: 1, es_precursora: true, gramos_por_unidad: 45 },
      { id: "pf", nombre: "Pastafrola", rinde: 1, es_precursora: false },
    ];
    const ings = [
      { receta_id: "ms", insumo_id: "harina", cantidad: 500, unidad: "g" },
      { receta_id: "ms45", receta_id_precursora: "ms", cantidad: 45, unidad: "g" },
      { receta_id: "pf", receta_id_precursora: "ms45", cantidad: 1, unidad: "u" },
    ];
    const deps = recetasDependientesDe("ms", ings);
    expect(deps.sort()).toEqual(["ms45", "pf"]);
    const updates = costosParaRecetaYCadena("ms", recetas, ings, insumos);
    expect(updates.map((u) => String(u.id)).sort()).toEqual(["ms", "ms45", "pf"]);
    expect(updates.find((u) => u.id === "pf").costo_unitario).toBeGreaterThan(0);
  });

  test("empanada 1u masa", () => {
    const recetas = [
      { id: "me", nombre: "Masa Empanada", rinde: 30, es_precursora: true },
      { id: "e", nombre: "Empanada", rinde: 1, es_precursora: false },
    ];
    const ings = [
      { receta_id: "me", insumo_id: "harina", cantidad: 300, unidad: "g" },
      { receta_id: "e", receta_id_precursora: "me", cantidad: 1, unidad: "u" },
    ];
    const updates = costosParaRecetaYCadena("me", recetas, ings, insumos);
    expect(updates.find((u) => u.id === "e").costo_unitario).toBeGreaterThan(0);
  });
});
