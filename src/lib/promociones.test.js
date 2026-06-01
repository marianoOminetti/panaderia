import {
  calcularPromosEnCarrito,
  aplicarDescuentoPromoARows,
  recetasEnOtrasPromosActivas,
  TIPOS_PROMO,
} from "./promociones";

const recetaA = { id: "a", nombre: "A", precio_venta: 500 };
const recetaB = { id: "b", nombre: "B", precio_venta: 300 };

const promo5x4 = {
  id: "p1",
  nombre: "Promo test",
  tipo: "nxm",
  llevar: 5,
  pagar: 4,
  activa: true,
  receta_ids: ["a", "b"],
};

describe("calcularPromosEnCarrito", () => {
  it("sin unidades suficientes no aplica descuento", () => {
    const cart = [{ receta: recetaA, cantidad: 4, precio_unitario: 500 }];
    const r = calcularPromosEnCarrito(cart, [promo5x4]);
    expect(r.descuentoTotal).toBe(0);
    expect(r.totalFinal).toBe(2000);
  });

  it("5 unidades aplica una unidad gratis (la más barata)", () => {
    const cart = [
      { receta: recetaA, cantidad: 3, precio_unitario: 500 },
      { receta: recetaB, cantidad: 2, precio_unitario: 300 },
    ];
    const r = calcularPromosEnCarrito(cart, [promo5x4]);
    expect(r.descuentoTotal).toBe(300);
    expect(r.totalFinal).toBe(1800);
    expect(r.aplicadas).toHaveLength(1);
  });

  it("10 unidades aplica dos gratis", () => {
    const cart = [{ receta: recetaA, cantidad: 10, precio_unitario: 100 }];
    const r = calcularPromosEnCarrito(cart, [promo5x4]);
    expect(r.descuentoTotal).toBe(200);
    expect(r.totalFinal).toBe(800);
  });

  it("productos fuera de la promo no cuentan", () => {
    const recetaC = { id: "c", nombre: "C", precio_venta: 1000 };
    const cart = [
      { receta: recetaC, cantidad: 5, precio_unitario: 1000 },
      { receta: recetaA, cantidad: 2, precio_unitario: 500 },
    ];
    const r = calcularPromosEnCarrito(cart, [promo5x4]);
    expect(r.descuentoTotal).toBe(0);
    expect(r.totalFinal).toBe(6000);
  });
});

describe("aplicarDescuentoPromoARows", () => {
  it("reparte descuento sin total_final negativo", () => {
    const rows = [{ subtotal: 200 }, { subtotal: 1000 }];
    const out = aplicarDescuentoPromoARows(rows, 500, "p1");
    expect(out[0].descuento).toBe(200);
    expect(out[0].total_final).toBe(0);
    expect(out[1].descuento).toBe(300);
    expect(out[1].total_final).toBe(700);
  });
});

describe("porcentaje en productos", () => {
  const promo20 = {
    id: "p2",
    nombre: "20% off",
    tipo: TIPOS_PROMO.PORCENTAJE_PRODUCTOS,
    porcentaje: 20,
    activa: true,
    receta_ids: ["a"],
  };

  it("aplica % solo sobre productos elegidos", () => {
    const cart = [
      { receta: recetaA, cantidad: 2, precio_unitario: 1000 },
      { receta: recetaB, cantidad: 1, precio_unitario: 500 },
    ];
    const r = calcularPromosEnCarrito(cart, [promo20]);
    expect(r.descuentoTotal).toBe(400);
    expect(r.totalFinal).toBe(2100);
  });
});

describe("porcentaje por monto mínimo", () => {
  const promoMin = {
    id: "p3",
    nombre: "20% desde 50k",
    tipo: TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO,
    porcentaje: 20,
    monto_minimo: 50000,
    activa: true,
    receta_ids: [],
  };

  it("no aplica si no alcanza el mínimo", () => {
    const cart = [{ receta: recetaA, cantidad: 10, precio_unitario: 4000 }];
    const r = calcularPromosEnCarrito(cart, [promoMin]);
    expect(r.descuentoTotal).toBe(0);
    expect(r.totalFinal).toBe(40000);
  });

  it("aplica % sobre el total del carrito", () => {
    const cart = [{ receta: recetaA, cantidad: 15, precio_unitario: 4000 }];
    const r = calcularPromosEnCarrito(cart, [promoMin]);
    expect(r.descuentoTotal).toBe(12000);
    expect(r.totalFinal).toBe(48000);
  });
});

describe("recetasEnOtrasPromosActivas", () => {
  it("excluye la promo en edición", () => {
    const promos = [
      { id: "p1", activa: true, receta_ids: ["a"] },
      { id: "p2", activa: true, receta_ids: ["b"] },
    ];
    const set = recetasEnOtrasPromosActivas(promos, "p1");
    expect(set.has("a")).toBe(false);
    expect(set.has("b")).toBe(true);
  });
});
