import {
  isPendingVentaId,
  mergeVentasFromFetch,
  resolveOptimisticVentasState,
  dedupeOptimisticVentas,
} from "./ventas";

describe("isPendingVentaId", () => {
  it("detecta ids optimistas de venta", () => {
    expect(isPendingVentaId("pending-abc-0")).toBe(true);
    expect(isPendingVentaId("pending-edit-abc-receta1")).toBe(true);
    expect(isPendingVentaId("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
  });
});

describe("mergeVentasFromFetch", () => {
  it("descarta pending cuando el fetch trae la misma transaccion_id", () => {
    const tid = "tx-1";
    const prev = [
      { id: "pending-tx-1-0", transaccion_id: tid, cantidad: 2 },
    ];
    const fetched = [{ id: "real-1", transaccion_id: tid, cantidad: 2 }];
    expect(mergeVentasFromFetch(prev, fetched)).toEqual(fetched);
  });

  it("conserva pending si el fetch aún no trae esa transacción", () => {
    const prev = [{ id: "pending-tx-1-0", transaccion_id: "tx-1", cantidad: 2 }];
    const fetched = [{ id: "real-2", transaccion_id: "tx-2", cantidad: 1 }];
    const merged = mergeVentasFromFetch(prev, fetched);
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe("pending-tx-1-0");
    expect(merged[1].id).toBe("real-2");
  });
});

describe("resolveOptimisticVentasState", () => {
  it("reemplaza pending por filas insertadas sin duplicar", () => {
    const tid = "tx-1";
    const prev = [
      { id: "pending-tx-1-0", transaccion_id: tid, cantidad: 2 },
      { id: "other", transaccion_id: "tx-2", cantidad: 1 },
    ];
    const inserted = [{ id: "real-1", transaccion_id: tid, cantidad: 2 }];
    const next = resolveOptimisticVentasState(prev, tid, inserted, ["pending-tx-1-0"]);
    expect(next).toEqual([
      { id: "real-1", transaccion_id: tid, cantidad: 2 },
      { id: "other", transaccion_id: "tx-2", cantidad: 1 },
    ]);
  });
});

describe("dedupeOptimisticVentas", () => {
  it("elimina pending cuando ya hay filas reales de la misma transacción", () => {
    const tid = "tx-1";
    const input = [
      { id: "pending-tx-1-0", transaccion_id: tid, cantidad: 2 },
      { id: "real-1", transaccion_id: tid, cantidad: 2 },
    ];
    expect(dedupeOptimisticVentas(input)).toEqual([
      { id: "real-1", transaccion_id: tid, cantidad: 2 },
    ]);
  });
});
