import {
  buildAfipReceptorPayload,
  buildAfipReceptorForRetry,
  shouldPersistClienteFiscal,
  afipReceptorFromCliente,
} from "./afipReceptor";

describe("buildAfipReceptorPayload", () => {
  const clientes = [
    {
      id: "c1",
      nombre: "María",
      cuit: "20123456786",
      razon_social: "María SA",
    },
  ];

  test("vacío sin cliente → Consumidor Final", () => {
    const r = buildAfipReceptorPayload({ cuit: "", razon_social: "" }, null, []);
    expect(r.ok).toBe(true);
    expect(r.receptor.razon_social).toBe("Consumidor Final");
    expect(r.receptor.cuit).toBeNull();
  });

  test("CUIT inválido → error", () => {
    const r = buildAfipReceptorPayload(
      { cuit: "123", razon_social: "X" },
      null,
      [],
    );
    expect(r.ok).toBe(false);
  });

  test("CUIT válido sin razón → error", () => {
    const r = buildAfipReceptorPayload(
      { cuit: "20123456786", razon_social: "" },
      null,
      [],
    );
    expect(r.ok).toBe(false);
  });

  test("usa CUIT de ficha si panel vacío", () => {
    const r = buildAfipReceptorPayload(
      { cuit: "", razon_social: "" },
      "c1",
      clientes,
    );
    expect(r.ok).toBe(true);
    expect(r.receptor.cuit).toBe("20123456786");
    expect(r.receptor.razon_social).toBe("María SA");
  });
});

describe("buildAfipReceptorForRetry", () => {
  test("prioriza snapshot de factura", () => {
    const r = buildAfipReceptorForRetry(
      "tx-1",
      {
        "tx-1": {
          receptor_cuit: "20987654326",
          receptor_razon_social: "Empresa X",
        },
      },
      [],
      [],
    );
    expect(r.cuit).toBe("20987654326");
    expect(r.razon_social).toBe("Empresa X");
  });
});

describe("shouldPersistClienteFiscal", () => {
  test("no persiste Consumidor Final vacío", () => {
    expect(
      shouldPersistClienteFiscal({ cuit: null, razon_social: "Consumidor Final" }),
    ).toBe(false);
  });
  test("persiste con CUIT", () => {
    expect(
      shouldPersistClienteFiscal({ cuit: "20123456786", razon_social: "X" }),
    ).toBe(true);
  });
});

describe("afipReceptorFromCliente", () => {
  test("mapea ficha", () => {
    expect(
      afipReceptorFromCliente({
        nombre: "A",
        cuit: "20-12345678-6",
        razon_social: "A SRL",
      }),
    ).toEqual({ cuit: "20123456786", razon_social: "A SRL" });
  });
});
