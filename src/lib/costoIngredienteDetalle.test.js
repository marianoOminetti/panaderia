import { detalleHoverIngrediente } from "./costoIngredienteDetalle";

const insumos = [
  { id: "az", nombre: "Azúcar", precio: 1000, cantidad_presentacion: 1000, unidad: "g" },
  { id: "prem", nombre: "Premezcla", precio: 5000, cantidad_presentacion: 1000, unidad: "g" },
  { id: "man", nombre: "Manteca", precio: 4000, cantidad_presentacion: 200, unidad: "g" },
];

describe("costoIngredienteDetalle", () => {
  test("insumo muestra presentación de Insumos", () => {
    const det = detalleHoverIngrediente(
      { insumo_id: "az", cantidad: 75, unidad: "g" },
      { insumos, recetas: [], recetaIngredientes: [] },
    );
    expect(det.tipo).toBe("insumo");
    expect(det.titulo).toBe("Azúcar");
    expect(det.presentacion).toMatch(/\$.*1\.000.*1000 g/);
    expect(det.cantidadUsada).toBe("75 g");
    expect(det.costoLinea).toBeCloseTo(75, 0);
  });

  test("precursora desglosa insumos de la masa", () => {
    const recetas = [
      { id: "ms", nombre: "Masa Sablée", rinde: 1, es_precursora: true, gramos_por_unidad: 1000 },
    ];
    const recetaIngredientes = [
      { receta_id: "ms", insumo_id: "az", cantidad: 75, unidad: "g" },
      { receta_id: "ms", insumo_id: "prem", cantidad: 200, unidad: "g" },
      { receta_id: "ms", insumo_id: "man", cantidad: 100, unidad: "g" },
    ];
    const det = detalleHoverIngrediente(
      { receta_id_precursora: "ms", cantidad: 45, unidad: "g" },
      { insumos, recetas, recetaIngredientes },
    );
    expect(det.tipo).toBe("precursora");
    expect(det.titulo).toBe("Masa Sablée");
    expect(det.lineas).toHaveLength(3);
    expect(det.lineas.map((l) => l.nombre)).toEqual(["Azúcar", "Premezcla", "Manteca"]);
    expect(det.lineas[0].presentacion).toMatch(/\$.*1\.000/);
    expect(det.lineas[0].costo).toBeCloseTo(75, 0);
  });

  test("precursora anidada desglosa hasta insumos hoja", () => {
    const recetas = [
      { id: "ms", nombre: "Masa Sablée", rinde: 1, es_precursora: true, gramos_por_unidad: 1000 },
      { id: "ms45", nombre: "Masa 45g", rinde: 1, es_precursora: true, gramos_por_unidad: 45 },
    ];
    const recetaIngredientes = [
      { receta_id: "ms", insumo_id: "az", cantidad: 75, unidad: "g" },
      { receta_id: "ms", insumo_id: "prem", cantidad: 200, unidad: "g" },
      { receta_id: "ms45", receta_id_precursora: "ms", cantidad: 45, unidad: "g" },
    ];
    const det = detalleHoverIngrediente(
      { receta_id_precursora: "ms45", cantidad: 1, unidad: "u" },
      { insumos, recetas, recetaIngredientes },
    );
    expect(det.costoLinea).toBeGreaterThan(0);
    expect(det.lineas.map((l) => l.nombre)).toEqual(["Azúcar", "Premezcla"]);
    expect(det.lineas[0].presentacion).toMatch(/\$.*1\.000/);
  });
});
