import { isCantidadEnEdicion, toCantidadNumber } from "./format";

describe("cantidad decimal en carrito", () => {
  test("isCantidadEnEdicion mantiene punto intermedio", () => {
    expect(isCantidadEnEdicion("2.")).toBe(true);
    expect(isCantidadEnEdicion("0.")).toBe(true);
    expect(isCantidadEnEdicion("2.5")).toBe(false);
  });

  test("toCantidadNumber parsea decimales completos", () => {
    expect(toCantidadNumber("2.5")).toBe(2.5);
    expect(toCantidadNumber("2,5")).toBe(2.5);
  });
});
