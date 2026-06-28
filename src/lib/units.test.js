import {
  GRAMOS_POR_HUEVO,
  esInsumoHuevos,
  convertirAUnidadInsumo,
} from "./units";

const huevos = { nombre: "Huevos", unidad: "u" };

describe("esInsumoHuevos", () => {
  test("detecta huevos por nombre", () => {
    expect(esInsumoHuevos(huevos)).toBe(true);
    expect(esInsumoHuevos("Huevo")).toBe(true);
    expect(esInsumoHuevos({ nombre: "Harina" })).toBe(false);
  });
});

describe("convertirAUnidadInsumo — huevos", () => {
  test("50 g = 1 u", () => {
    expect(convertirAUnidadInsumo(50, "g", "u", huevos)).toBe(1);
    expect(convertirAUnidadInsumo(GRAMOS_POR_HUEVO, "g", "u", huevos)).toBe(1);
  });

  test("1 u = 50 g al convertir hacia gramos", () => {
    expect(convertirAUnidadInsumo(1, "u", "g", huevos)).toBe(50);
    expect(convertirAUnidadInsumo(0.5, "u", "g", huevos)).toBe(25);
  });

  test("gramos fraccionarios → unidades de huevo", () => {
    expect(convertirAUnidadInsumo(4, "g", "u", huevos)).toBeCloseTo(0.08);
    expect(convertirAUnidadInsumo(100, "g", "u", huevos)).toBe(2);
  });

  test("unidades en receta se mantienen", () => {
    expect(convertirAUnidadInsumo(2, "u", "u", huevos)).toBe(2);
    expect(convertirAUnidadInsumo(0.5, "u", "u", huevos)).toBe(0.5);
  });

  test("1 u y 50 g dan el mismo costo en unidades de insumo", () => {
    const desdeGramos = convertirAUnidadInsumo(50, "g", "u", huevos);
    const desdeUnidades = convertirAUnidadInsumo(1, "u", "u", huevos);
    expect(desdeGramos).toBe(desdeUnidades);
  });

  test("sin insumo huevos no aplica conversión g→u", () => {
    expect(convertirAUnidadInsumo(50, "g", "u")).toBe(50);
  });
});
