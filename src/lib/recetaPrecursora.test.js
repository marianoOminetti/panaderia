import {
  unidadDefaultPrecursora,
  cantidadDefaultPrecursora,
  defaultsAlElegirPrecursora,
} from "./recetaPrecursora";

describe("recetaPrecursora", () => {
  test("sin gramos_por_unidad usa unidades", () => {
    const masa = { nombre: "Masa Empanada", gramos_por_unidad: null };
    expect(unidadDefaultPrecursora(masa)).toBe("u");
    expect(cantidadDefaultPrecursora(masa)).toBe("1");
    expect(defaultsAlElegirPrecursora(masa)).toEqual({ unidad: "u", cantidad: "1" });
  });

  test("con gramos_por_unidad usa gramos", () => {
    const masa = { nombre: "Masa Brownie", gramos_por_unidad: 175 };
    expect(unidadDefaultPrecursora(masa)).toBe("g");
    expect(cantidadDefaultPrecursora(masa)).toBe("175");
    expect(defaultsAlElegirPrecursora(masa)).toEqual({ unidad: "g", cantidad: "175" });
  });
});
