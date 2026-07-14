import {
  resolveReceptorComprobante,
  buildFacturaFiscalData,
  buildGrupoTotalesConPromo,
  buildGrupoLineasLista,
  formatComprobanteNumero,
  facturaPuedeRefacturarAfip,
  facturaPuedeEmitirNotaCredito,
  facturaFueRefacturada,
} from "./facturaFiscal";

describe("formatComprobanteNumero", () => {
  test("formatea pto vta y número con ceros", () => {
    expect(formatComprobanteNumero(1, 42)).toBe("00001-00000042");
  });
});

describe("resolveReceptorComprobante", () => {
  test("snapshot con CUIT", () => {
    const r = resolveReceptorComprobante(
      {
        cae: "123",
        estado: "autorizada",
        receptor_cuit: "20123456786",
        receptor_razon_social: "Pan SA",
      },
      { cuit: "20987654326", razon_social: "Otro" },
    );
    expect(r.razon_social).toBe("Pan SA");
    expect(r.cuit_display).toBe("20-12345678-6");
    expect(r.es_consumidor_final).toBe(false);
  });

  test("fallback ficha cliente", () => {
    const r = resolveReceptorComprobante(null, {
      nombre: "Juan",
      cuit: "20123456786",
      razon_social: "Juan SRL",
    });
    expect(r.razon_social).toBe("Juan SRL");
    expect(r.cuit).toBe("20123456786");
  });

  test("consumidor final", () => {
    const r = resolveReceptorComprobante(null, null);
    expect(r.es_consumidor_final).toBe(true);
    expect(r.cuit).toBeNull();
  });

  test("CF en AFIP no usa CUIT nuevo de la ficha", () => {
    const r = resolveReceptorComprobante(
      {
        cae: "123",
        estado: "autorizada",
        receptor_cuit: null,
        receptor_razon_social: "Consumidor Final",
      },
      { nombre: "Juan", cuit: "20123456786", razon_social: "Juan SRL" },
    );
    expect(r.es_consumidor_final).toBe(true);
    expect(r.cuit).toBeNull();
  });
});

describe("buildFacturaFiscalData", () => {
  test("incluye receptor en data del comprobante", () => {
    const grupo = {
      cliente_id: "c1",
      total: 1000,
      rawItems: [{ fecha: "2026-06-04", receta_id: "r1", cantidad: 1, precio_unitario: 1000 }],
    };
    const factura = {
      estado: "autorizada",
      cae: "123",
      emisor_cuit: "20123456786",
      receptor_cuit: "20987654326",
      receptor_doc_tipo: 80,
      receptor_doc_nro: "20987654326",
      receptor_razon_social: "Empresa",
      importe_total: 1000,
      punto_venta: 1,
      numero_comprobante: 42,
    };
    const data = buildFacturaFiscalData(grupo, factura, [], [
      { id: "c1", nombre: "Otro" },
    ]);
    expect(data.receptorRazon).toBe("Empresa");
    expect(data.receptorDocEtiqueta).toBe("CUIT");
    expect(data.receptorDocDisplay).toBe("20-98765432-6");
    expect(data.esConsumidorFinal).toBe(false);
    expect(data.comprobanteNumero).toBe("00001-00000042");
    expect(data.emisorCuit).toBe("20-12345678-6");
    expect(data.emisorDomicilio).toBe("San Carlos 266, La Banda");
    expect(data.emisorInicioActividades).toBe("11/25");
  });

  test("líneas a precio lista y bloque subtotal/promo/total", () => {
    const grupo = {
      total: 1840,
      items: [
        { receta_id: "r1", cantidad: 3, precio_unitario: 250, total_final: 500 },
        { receta_id: "r2", cantidad: 1, precio_unitario: 150, total_final: 150 },
      ],
      rawItems: [{ promocion_id: "p1", fecha: "2026-06-04" }],
    };
    const items = buildGrupoLineasLista(grupo, []);
    expect(items[0]._lineTotal).toBe(750);
    const tot = buildGrupoTotalesConPromo(grupo, items, [{ id: "p1", nombre: "5x4" }], 1840);
    expect(tot.subtotal).toBe(900);
    expect(tot.descuento).toBe(0);

    const grupoPromo = { ...grupo, total: 750, items: [{ receta_id: "r1", cantidad: 3, precio_unitario: 250 }] };
    const tot2 = buildGrupoTotalesConPromo(
      grupoPromo,
      buildGrupoLineasLista(grupoPromo, []),
      [{ id: "p1", nombre: "5x4" }],
      500,
    );
    expect(tot2.subtotal).toBe(750);
    expect(tot2.descuento).toBe(250);
    expect(tot2.descuentoLabel).toBe("Promo: 5x4");
    expect(tot2.total).toBe(500);
  });

  test("comprobante con DNI en snapshot", () => {
    const grupo = {
      total: 1000,
      rawItems: [{ fecha: "2026-06-04", receta_id: "r1", cantidad: 1, precio_unitario: 1000 }],
    };
    const factura = {
      estado: "autorizada",
      cae: "123",
      receptor_doc_tipo: 96,
      receptor_doc_nro: "35123456",
      receptor_razon_social: "Ana López",
      importe_total: 1000,
      punto_venta: 1,
      numero_comprobante: 1,
      emisor_cuit: "20123456786",
    };
    const data = buildFacturaFiscalData(grupo, factura, [], []);
    expect(data.receptorDocEtiqueta).toBe("DNI");
    expect(data.receptorDocDisplay).toBe("35123456");
    expect(data.esConsumidorFinal).toBe(false);
  });

  test("genera qrUrl con emisor_cuit de la factura", () => {
    const grupo = {
      total: 70000,
      rawItems: [{ fecha: "2026-06-04", receta_id: "r1", cantidad: 1, precio_unitario: 70000 }],
    };
    const factura = {
      estado: "autorizada",
      cae: "70417054367476",
      importe_total: 70000,
      punto_venta: 2,
      numero_comprobante: 150,
      emisor_cuit: "20123456786",
      tipo_comprobante: 11,
    };
    const data = buildFacturaFiscalData(grupo, factura, [], []);
    expect(data.qrUrl).toMatch(/^https:\/\/www\.afip\.gob\.ar\/fe\/qr\/\?p=/);
  });
});

describe("facturaPuedeRefacturarAfip", () => {
  const factura = {
    estado: "autorizada",
    cae: "123",
    punto_venta: 2,
    numero_comprobante: 100,
  };

  test("permite refacturar si la NC anuló esa factura", () => {
    expect(
      facturaPuedeRefacturarAfip(factura, {
        estado: "autorizada",
        cae: "456",
        factura_punto_venta: 2,
        factura_numero: 100,
      }),
    ).toBe(true);
  });

  test("no permite si la factura ya fue reemplazada", () => {
    expect(
      facturaPuedeRefacturarAfip(
        { ...factura, numero_comprobante: 101 },
        {
          estado: "autorizada",
          cae: "456",
          factura_punto_venta: 2,
          factura_numero: 100,
        },
      ),
    ).toBe(false);
  });
});

describe("facturaFueRefacturada", () => {
  test("detecta factura nueva distinta a la anulada por NC", () => {
    expect(
      facturaFueRefacturada(
        {
          estado: "autorizada",
          cae: "999",
          punto_venta: 2,
          numero_comprobante: 101,
        },
        {
          estado: "autorizada",
          cae: "456",
          factura_punto_venta: 2,
          factura_numero: 100,
        },
      ),
    ).toBe(true);
  });
});

describe("facturaPuedeEmitirNotaCredito", () => {
  const factura = {
    estado: "autorizada",
    cae: "123",
    punto_venta: 2,
    numero_comprobante: 100,
  };

  test("no permite si la NC ya anuló la factura vigente", () => {
    expect(
      facturaPuedeEmitirNotaCredito(factura, {
        estado: "autorizada",
        cae: "456",
        factura_punto_venta: 2,
        factura_numero: 100,
      }),
    ).toBe(false);
  });

  test("permite NC si hubo refacturación (factura nueva)", () => {
    expect(
      facturaPuedeEmitirNotaCredito(
        { ...factura, numero_comprobante: 101 },
        {
          estado: "autorizada",
          cae: "456",
          factura_punto_venta: 2,
          factura_numero: 100,
        },
      ),
    ).toBe(true);
  });
});
