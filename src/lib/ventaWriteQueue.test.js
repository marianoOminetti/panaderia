import { enqueueVentaWrite, isVentaWriteBusy } from "./ventaWriteQueue";

describe("ventaWriteQueue", () => {
  it("serializa operaciones", async () => {
    const order = [];
    const p1 = enqueueVentaWrite(async () => {
      order.push(1);
      await new Promise((r) => setTimeout(r, 20));
      order.push(2);
    });
    const p2 = enqueueVentaWrite(async () => {
      order.push(3);
    });
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("isVentaWriteBusy refleja operaciones en curso", async () => {
    let busyDuring = false;
    const p = enqueueVentaWrite(async () => {
      busyDuring = isVentaWriteBusy();
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(isVentaWriteBusy()).toBe(true);
    await p;
    expect(busyDuring).toBe(true);
    expect(isVentaWriteBusy()).toBe(false);
  });
});
