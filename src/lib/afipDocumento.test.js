import { detectAfipDocumento } from "./afipDocumento";

describe("detectAfipDocumento", () => {
  test("vacío → consumidor final", () => {
    const r = detectAfipDocumento("");
    expect(r.ok).toBe(true);
    expect(r.tipo).toBe("cf");
    expect(r.doc_tipo).toBe(99);
  });

  test("11 dígitos válidos → CUIT", () => {
    const r = detectAfipDocumento("20123456786");
    expect(r.ok).toBe(true);
    expect(r.tipo).toBe("cuit");
    expect(r.doc_tipo).toBe(80);
    expect(r.cuit).toBe("20123456786");
  });

  test("8 dígitos → DNI", () => {
    const r = detectAfipDocumento("35123456");
    expect(r.ok).toBe(true);
    expect(r.tipo).toBe("dni");
    expect(r.doc_tipo).toBe(96);
    expect(r.dni).toBe("35123456");
  });

  test("7 dígitos → DNI", () => {
    const r = detectAfipDocumento("1234567");
    expect(r.ok).toBe(true);
    expect(r.tipo).toBe("dni");
  });

  test("11 dígitos inválidos → error", () => {
    const r = detectAfipDocumento("12345678901");
    expect(r.ok).toBe(false);
  });

  test("9 dígitos → error", () => {
    const r = detectAfipDocumento("123456789");
    expect(r.ok).toBe(false);
  });
});
