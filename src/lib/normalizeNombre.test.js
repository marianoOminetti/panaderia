import { normalizeNombreUpper, normalizeNombreUpperOrNull } from "./normalizeNombre";

describe("normalizeNombreUpper", () => {
  test("trim y uppercase", () => {
    expect(normalizeNombreUpper("  harina  ")).toBe("HARINA");
    expect(normalizeNombreUpper("Pan de Molde")).toBe("PAN DE MOLDE");
  });

  test("vacío", () => {
    expect(normalizeNombreUpper("")).toBe("");
    expect(normalizeNombreUpper(null)).toBe("");
  });
});

describe("normalizeNombreUpperOrNull", () => {
  test("null si vacío", () => {
    expect(normalizeNombreUpperOrNull("")).toBeNull();
    expect(normalizeNombreUpperOrNull("  ")).toBeNull();
  });

  test("uppercase si hay texto", () => {
    expect(normalizeNombreUpperOrNull("Brownie")).toBe("BROWNIE");
  });
});
