import {
  resolveReceptorComprobante,
  buildFacturaFiscalData,
} from "./facturaFiscal";

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
      receptor_cuit: "20123456786",
      receptor_razon_social: "Empresa",
      importe_total: 1000,
      punto_venta: 1,
      numero_comprobante: 42,
    };
    const data = buildFacturaFiscalData(grupo, factura, [], [
      { id: "c1", nombre: "Otro" },
    ]);
    expect(data.receptorRazon).toBe("Empresa");
    expect(data.receptorCuit).toBe("20-12345678-6");
    expect(data.esConsumidorFinal).toBe(false);
  });
});
