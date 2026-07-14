import {
  fingerprintCantidadesPorReceta,
  matchVentasLegacyAPedido,
  resolveVentasParaDesentregar,
} from "./pedidoEntrega";

describe("fingerprintCantidadesPorReceta", () => {
  it("agrega cantidades por receta y ordena", () => {
    expect(
      fingerprintCantidadesPorReceta([
        { receta_id: "b", cantidad: 1 },
        { receta_id: "a", cantidad: 2 },
        { receta_id: "b", cantidad: 0.5 },
      ]),
    ).toBe("a:2|b:1.5");
  });
});

describe("matchVentasLegacyAPedido", () => {
  const grupo = {
    key: "pedido-1",
    cliente_id: "cli-1",
    fecha_entrega: "2026-07-10",
    rawItems: [
      { receta_id: "r1", cantidad: 2, precio_unitario: 1000 },
      { receta_id: "r2", cantidad: 1, precio_unitario: 500 },
    ],
  };

  it("encuentra la transaccion con misma firma y cliente", () => {
    const ventas = [
      {
        id: "v1",
        transaccion_id: "tx-old",
        cliente_id: "cli-1",
        receta_id: "r1",
        cantidad: 2,
        fecha: "2026-07-10",
        created_at: "2026-07-10T12:00:00Z",
      },
      {
        id: "v2",
        transaccion_id: "tx-old",
        cliente_id: "cli-1",
        receta_id: "r2",
        cantidad: 1,
        fecha: "2026-07-10",
        created_at: "2026-07-10T12:00:00Z",
      },
      {
        id: "v3",
        transaccion_id: "tx-otra",
        cliente_id: "cli-1",
        receta_id: "r1",
        cantidad: 9,
        fecha: "2026-07-10",
      },
    ];
    const match = matchVentasLegacyAPedido(grupo, ventas);
    expect(match.transaccionId).toBe("tx-old");
    expect(match.ventas).toHaveLength(2);
  });

  it("prioriza la fecha mas cercana a la entrega", () => {
    const ventas = [
      {
        id: "a1",
        transaccion_id: "tx-lejos",
        cliente_id: "cli-1",
        receta_id: "r1",
        cantidad: 2,
        fecha: "2026-06-01",
        created_at: "2026-06-01T10:00:00Z",
      },
      {
        id: "a2",
        transaccion_id: "tx-lejos",
        cliente_id: "cli-1",
        receta_id: "r2",
        cantidad: 1,
        fecha: "2026-06-01",
        created_at: "2026-06-01T10:00:00Z",
      },
      {
        id: "b1",
        transaccion_id: "tx-cerca",
        cliente_id: "cli-1",
        receta_id: "r1",
        cantidad: 2,
        fecha: "2026-07-10",
        created_at: "2026-07-10T10:00:00Z",
      },
      {
        id: "b2",
        transaccion_id: "tx-cerca",
        cliente_id: "cli-1",
        receta_id: "r2",
        cantidad: 1,
        fecha: "2026-07-10",
        created_at: "2026-07-10T10:00:00Z",
      },
    ];
    const match = matchVentasLegacyAPedido(grupo, ventas);
    expect(match.transaccionId).toBe("tx-cerca");
  });

  it("ignora ventas de otro cliente", () => {
    const ventas = [
      {
        id: "v1",
        transaccion_id: "tx-otro",
        cliente_id: "cli-2",
        receta_id: "r1",
        cantidad: 2,
        fecha: "2026-07-10",
      },
      {
        id: "v2",
        transaccion_id: "tx-otro",
        cliente_id: "cli-2",
        receta_id: "r2",
        cantidad: 1,
        fecha: "2026-07-10",
      },
    ];
    expect(matchVentasLegacyAPedido(grupo, ventas)).toBeNull();
  });
});

describe("resolveVentasParaDesentregar", () => {
  it("usa matching legacy cuando no hay venta_transaccion_id", async () => {
    const grupo = {
      key: "pedido-uuid",
      cliente_id: "cli-1",
      fecha_entrega: "2026-07-10",
      rawItems: [{ receta_id: "r1", cantidad: 3 }],
    };
    const ventasLocales = [
      {
        id: "v1",
        transaccion_id: "random-old",
        cliente_id: "cli-1",
        receta_id: "r1",
        cantidad: 3,
        fecha: "2026-07-10",
        created_at: "2026-07-10T15:00:00Z",
      },
    ];
    const resolved = await resolveVentasParaDesentregar({
      grupo,
      ventasLocales,
    });
    expect(resolved.legacy).toBe(true);
    expect(resolved.transaccionId).toBe("random-old");
    expect(resolved.ventas).toHaveLength(1);
  });

  it("consulta por cliente si no hay match local", async () => {
    const grupo = {
      key: "pedido-uuid",
      cliente_id: "cli-1",
      fecha_entrega: "2026-07-10",
      rawItems: [{ receta_id: "r1", cantidad: 1 }],
    };
    const fetchByClienteId = jest.fn(async () => [
      {
        id: "v9",
        transaccion_id: "from-db",
        cliente_id: "cli-1",
        receta_id: "r1",
        cantidad: 1,
        fecha: "2026-07-10",
      },
    ]);
    const resolved = await resolveVentasParaDesentregar({
      grupo,
      ventasLocales: [],
      fetchByClienteId,
    });
    expect(fetchByClienteId).toHaveBeenCalledWith("cli-1");
    expect(resolved.transaccionId).toBe("from-db");
  });
});
