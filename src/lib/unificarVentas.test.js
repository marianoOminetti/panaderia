import {
  grupoEstadoPago,
  transaccionLiberadaParaUnificar,
  validarUnificacion,
  buildResumenUnificacion,
  buildShareDataUnificado,
  buildPreviewSeparar,
} from "./unificarVentas";

const grupo = (items, key = "tx-1") => ({
  key,
  rawItems: items,
  items,
  total: items.reduce((s, i) => s + (i.total_final ?? 0), 0),
});

describe("grupoEstadoPago", () => {
  test("debe si algún ítem debe", () => {
    expect(
      grupoEstadoPago(
        grupo([
          { estado_pago: "pagado", total_final: 100 },
          { estado_pago: "debe", total_final: 50 },
        ]),
      ),
    ).toBe("debe");
  });

  test("pagado si todos pagados", () => {
    expect(
      grupoEstadoPago(grupo([{ estado_pago: "pagado", total_final: 100 }])),
    ).toBe("pagado");
  });
});

describe("transaccionLiberadaParaUnificar", () => {
  test("sin factura", () => {
    expect(transaccionLiberadaParaUnificar(null, null)).toBe(true);
  });

  test("factura vigente sin NC", () => {
    expect(
      transaccionLiberadaParaUnificar({ cae: "1", estado: "autorizada" }, null),
    ).toBe(false);
  });

  test("factura anulada por NC activa", () => {
    expect(
      transaccionLiberadaParaUnificar(
        {
          cae: "1",
          estado: "mock",
          punto_venta: 1,
          numero_comprobante: 10,
        },
        {
          cae: "2",
          estado: "mock",
        },
      ),
    ).toBe(true);
  });
});

describe("validarUnificacion", () => {
  const pagado = grupo(
    [
      {
        id: "a",
        transaccion_id: "t1",
        estado_pago: "pagado",
        total_final: 100,
      },
    ],
    "t1",
  );
  const debe = grupo(
    [
      {
        id: "b",
        transaccion_id: "t2",
        estado_pago: "debe",
        total_final: 200,
      },
    ],
    "t2",
  );

  test("requiere al menos 2 grupos", () => {
    expect(validarUnificacion({ grupos: [pagado] }).ok).toBe(false);
  });

  test("no mezcla estados", () => {
    expect(validarUnificacion({ grupos: [pagado, debe] }).ok).toBe(false);
  });

  test("permite dos pagadas sin factura", () => {
    const g2 = grupo(
      [
        {
          id: "c",
          transaccion_id: "t3",
          estado_pago: "pagado",
          total_final: 50,
        },
      ],
      "t3",
    );
    expect(validarUnificacion({ grupos: [pagado, g2] }).ok).toBe(true);
  });

  test("bloquea factura en proceso sin CAE", () => {
    const g2 = grupo(
      [
        {
          id: "c",
          transaccion_id: "t3",
          estado_pago: "pagado",
          total_final: 50,
        },
      ],
      "t3",
    );
    const r = validarUnificacion({
      grupos: [pagado, g2],
      facturasByTransaccion: {
        t1: { estado: "pendiente" },
      },
    });
    expect(r.ok).toBe(false);
  });

  test("bloquea factura vigente", () => {
    const g2 = grupo(
      [
        {
          id: "c",
          transaccion_id: "t3",
          estado_pago: "pagado",
          total_final: 50,
        },
      ],
      "t3",
    );
    const r = validarUnificacion({
      grupos: [pagado, g2],
      facturasByTransaccion: {
        t1: { cae: "99", estado: "autorizada" },
      },
    });
    expect(r.ok).toBe(false);
  });
});

describe("buildResumenUnificacion", () => {
  test("agrupa secciones por fecha cuando hay días distintos", () => {
    const g1 = grupo(
      [
        {
          id: "1",
          receta_id: "r1",
          cantidad: 2,
          precio_unitario: 100,
          total_final: 200,
          fecha: "2026-03-01",
          estado_pago: "debe",
        },
      ],
      "t1",
    );
    const g2 = grupo(
      [
        {
          id: "2",
          receta_id: "r1",
          cantidad: 4,
          precio_unitario: 100,
          total_final: 400,
          fecha: "2026-03-03",
          estado_pago: "debe",
        },
      ],
      "t2",
    );
    const resumen = buildResumenUnificacion([g1, g2], [
      { id: "r1", nombre: "Alfajor", emoji: "🍪" },
    ]);
    expect(resumen.multipleFechas).toBe(true);
    expect(resumen.seccionesPorFecha).toHaveLength(2);
    expect(resumen.subtotal).toBe(600);
    expect(resumen.descuento).toBe(0);
    expect(resumen.total).toBe(600);
    expect(resumen.estadoPago).toBe("debe");
  });

  test("muestra precio lista y descuento cuando hay promo con total_final 0", () => {
    const g1 = grupo(
      [
        {
          id: "1",
          receta_id: "r1",
          cantidad: 1,
          precio_unitario: 500,
          total_final: 0,
          descuento: 500,
          promocion_id: "p1",
          fecha: "2026-03-01",
          estado_pago: "pagado",
        },
        {
          id: "2",
          receta_id: "r2",
          cantidad: 1,
          precio_unitario: 1000,
          total_final: 700,
          descuento: 300,
          promocion_id: "p1",
          fecha: "2026-03-01",
          estado_pago: "pagado",
        },
      ],
      "t1",
    );
    const g2 = grupo(
      [
        {
          id: "3",
          receta_id: "r1",
          cantidad: 2,
          precio_unitario: 500,
          total_final: 1000,
          fecha: "2026-03-02",
          estado_pago: "pagado",
        },
      ],
      "t2",
    );
    const resumen = buildResumenUnificacion(
      [g1, g2],
      [
        { id: "r1", nombre: "Factura", emoji: "🍞" },
        { id: "r2", nombre: "Tarta", emoji: "🥧" },
      ],
      [{ id: "p1", nombre: "5x4" }],
    );
    expect(resumen.items.map((it) => it._lineTotal)).toEqual([500, 1000, 1000]);
    expect(resumen.subtotal).toBe(2500);
    expect(resumen.descuento).toBe(800);
    expect(resumen.descuentoLabel).toBe("Promo: 5x4");
    expect(resumen.total).toBe(1700);

    const share = buildShareDataUnificado({
      clienteNombre: "Ana",
      resumen,
    });
    expect(share.descuento).toBe(800);
    expect(share.descuentoLabel).toBe("Promo: 5x4");
    expect(share.subtotal).toBe(2500);
    expect(share.total).toBe(1700);
  });
});

describe("buildPreviewSeparar", () => {
  test("agrupa líneas por transaccion origen", () => {
    const lineas = [
      {
        venta_id: "v1",
        transaccion_id_origen: "tx-a",
        estado_pago_origen: "pagado",
      },
      {
        venta_id: "v2",
        transaccion_id_origen: "tx-b",
        estado_pago_origen: "pagado",
      },
    ];
    const ventas = [
      {
        id: "v1",
        receta_id: "r1",
        cantidad: 1,
        total_final: 100,
        fecha: "2026-06-27",
      },
      {
        id: "v2",
        receta_id: "r2",
        cantidad: 2,
        total_final: 200,
        fecha: "2026-06-21",
      },
    ];
    const preview = buildPreviewSeparar(lineas, ventas, [
      { id: "r1", nombre: "A", emoji: "🍞" },
      { id: "r2", nombre: "B", emoji: "🥧" },
    ]);
    expect(preview.cantidadVisitas).toBe(2);
    expect(preview.total).toBe(300);
  });
});
