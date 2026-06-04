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
    {
      id: "c2",
      nombre: "Juan",
      dni: "35123456",
      razon_social: "",
    },
  ];

  test("vacío sin cliente → Consumidor Final", () => {
    const r = buildAfipReceptorPayload(
      { documento: "", razon_social: "" },
      null,
      [],
    );
    expect(r.ok).toBe(true);
    expect(r.receptor.razon_social).toBe("Consumidor Final");
    expect(r.receptor.cuit).toBeNull();
    expect(r.receptor.dni).toBeNull();
  });

  test("CUIT inválido → error", () => {
    const r = buildAfipReceptorPayload(
      { documento: "123", razon_social: "X" },
      null,
      [],
    );
    expect(r.ok).toBe(false);
  });

  test("CUIT válido sin razón → error", () => {
    const r = buildAfipReceptorPayload(
      { documento: "20123456786", razon_social: "" },
      null,
      [],
    );
    expect(r.ok).toBe(false);
  });

  test("DNI con nombre → ok", () => {
    const r = buildAfipReceptorPayload(
      { documento: "35123456", razon_social: "Juan Pérez" },
      null,
      [],
    );
    expect(r.ok).toBe(true);
    expect(r.receptor.dni).toBe("35123456");
    expect(r.receptor.doc_tipo).toBe(96);
    expect(r.receptor.cuit).toBeNull();
  });

  test("usa CUIT de ficha si panel vacío", () => {
    const r = buildAfipReceptorPayload(
      { documento: "", razon_social: "" },
      "c1",
      clientes,
    );
    expect(r.ok).toBe(true);
    expect(r.receptor.cuit).toBe("20123456786");
    expect(r.receptor.razon_social).toBe("María SA");
  });

  test("usa DNI de ficha si panel vacío", () => {
    const r = buildAfipReceptorPayload(
      { documento: "", razon_social: "" },
      "c2",
      clientes,
    );
    expect(r.ok).toBe(true);
    expect(r.receptor.dni).toBe("35123456");
    expect(r.receptor.razon_social).toBe("Juan");
  });
});

describe("buildAfipReceptorForRetry", () => {
  test("prioriza snapshot CUIT de factura", () => {
    const r = buildAfipReceptorForRetry(
      "tx-1",
      {
        "tx-1": {
          receptor_cuit: "20123456786",
          receptor_doc_tipo: 80,
          receptor_doc_nro: "20123456786",
          receptor_razon_social: "Empresa X",
        },
      },
      [],
      [],
    );
    expect(r.cuit).toBe("20123456786");
    expect(r.razon_social).toBe("Empresa X");
  });

  test("prioriza snapshot DNI de factura", () => {
    const r = buildAfipReceptorForRetry(
      "tx-1",
      {
        "tx-1": {
          receptor_doc_tipo: 96,
          receptor_doc_nro: "35123456",
          receptor_razon_social: "Ana López",
        },
      },
      [],
      [],
    );
    expect(r.dni).toBe("35123456");
    expect(r.doc_tipo).toBe(96);
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
  test("persiste con DNI", () => {
    expect(
      shouldPersistClienteFiscal({ dni: "35123456", razon_social: "X" }),
    ).toBe(true);
  });
});

describe("afipReceptorFromCliente", () => {
  test("mapea CUIT de ficha", () => {
    expect(
      afipReceptorFromCliente({
        nombre: "A",
        cuit: "20-12345678-6",
        razon_social: "A SRL",
      }),
    ).toEqual({ documento: "20123456786", razon_social: "A SRL" });
  });
  test("mapea DNI de ficha", () => {
    expect(
      afipReceptorFromCliente({
        nombre: "Ana",
        dni: "35123456",
      }),
    ).toEqual({ documento: "35123456", razon_social: "Ana" });
  });
});
