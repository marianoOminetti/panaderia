import {
  calcularPrecioListaCombo,
  calcularPromosEnCarrito,
  aplicarDescuentoPromoARows,
  comboTieneStockSuficiente,
  filtrarCombosActivos,
  normalizarPromociones,
  promoAplicaACliente,
  ALCANCE_PROMO,
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

  it("5 unidades mixtas con cantidad string (botón +) aplica promo", () => {
    const recetaTarta = { id: "t", nombre: "Tarta", precio_venta: 5000 };
    const cart = [
      { receta: recetaB, cantidad: 2, precio_unitario: 300 },
      { receta: recetaTarta, cantidad: 1, precio_unitario: 5000 },
      { receta: recetaA, cantidad: "3", precio_unitario: 500 },
    ];
    const r = calcularPromosEnCarrito(cart, [promo5x4]);
    expect(r.descuentoTotal).toBe(300);
    expect(r.totalFinal).toBe(6800);
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

describe("descuento fijo por unidad", () => {
  const promoFijo = {
    id: "p4",
    nombre: "Tarta -1000",
    tipo: TIPOS_PROMO.DESCUENTO_FIJO_UNIDAD,
    descuento_fijo: 1000,
    activa: true,
    receta_ids: ["a"],
  };

  it("1 unidad: descuenta el monto fijo", () => {
    const cart = [{ receta: recetaA, cantidad: 1, precio_unitario: 8500 }];
    const r = calcularPromosEnCarrito(cart, [promoFijo]);
    expect(r.descuentoTotal).toBe(1000);
    expect(r.totalFinal).toBe(7500);
  });

  it("varias unidades: descuento por unidad", () => {
    const cart = [{ receta: recetaA, cantidad: 2, precio_unitario: 8500 }];
    const r = calcularPromosEnCarrito(cart, [promoFijo]);
    expect(r.descuentoTotal).toBe(2000);
    expect(r.totalFinal).toBe(15000);
  });

  it("no supera el subtotal de la línea", () => {
    const cart = [{ receta: recetaA, cantidad: 1, precio_unitario: 500 }];
    const r = calcularPromosEnCarrito(cart, [{ ...promoFijo, descuento_fijo: 1000 }]);
    expect(r.descuentoTotal).toBe(500);
    expect(r.totalFinal).toBe(0);
  });

  it("productos fuera de la promo no cuentan", () => {
    const cart = [{ receta: recetaB, cantidad: 1, precio_unitario: 8500 }];
    const r = calcularPromosEnCarrito(cart, [promoFijo]);
    expect(r.descuentoTotal).toBe(0);
  });
});

describe("calcularPrecioListaCombo", () => {
  const recetas = [
    { id: "chipa", nombre: "Chipa 100g", precio_venta: 1500 },
    { id: "pizza", nombre: "Pizza", precio_venta: 9500 },
    { id: "emp", nombre: "Empanada", precio_venta: 1500 },
  ];

  it("suma precio × cantidad de cada producto", () => {
    expect(
      calcularPrecioListaCombo(recetas, ["chipa", "pizza", "emp"], {
        chipa: 4,
        pizza: 1,
        emp: 6,
      }),
    ).toBe(24500);
  });

  it("usa cantidad 1 si falta en el mapa", () => {
    expect(calcularPrecioListaCombo(recetas, ["pizza"], {})).toBe(9500);
  });
});

describe("filtrarCombosActivos", () => {
  const combo = {
    id: "c1",
    nombre: "Combo A",
    tipo: TIPOS_PROMO.COMBO_PRECIO_FIJO,
    activa: true,
    combo_items: [{ receta_id: "a", cantidad: 1 }],
  };

  it("incluye solo combos activos", () => {
    const list = filtrarCombosActivos([
      combo,
      { ...combo, id: "c2", activa: false },
      { id: "p1", tipo: TIPOS_PROMO.NXM, activa: true, receta_ids: ["a"] },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("c1");
  });
});

describe("comboTieneStockSuficiente", () => {
  it("true si hay stock para cada ítem", () => {
    expect(
      comboTieneStockSuficiente(
        { a: 10, b: 6 },
        [
          { receta_id: "a", cantidad: 4 },
          { receta_id: "b", cantidad: 6 },
        ],
      ),
    ).toBe(true);
  });

  it("false si falta stock en algún ítem", () => {
    expect(
      comboTieneStockSuficiente({ a: 3, b: 6 }, [{ receta_id: "a", cantidad: 4 }]),
    ).toBe(false);
  });

  it("descuenta lo que ya está en el carrito", () => {
    const cart = [{ receta: { id: "a" }, cantidad: 4, precio_unitario: 100 }];
    expect(
      comboTieneStockSuficiente(
        { a: 6, b: 6 },
        [
          { receta_id: "a", cantidad: 4 },
          { receta_id: "b", cantidad: 1 },
        ],
        cart,
      ),
    ).toBe(false);
  });
});

describe("combo precio fijo", () => {
  const promoCombo = {
    id: "p5",
    nombre: "Combo chipa+pizza+emp",
    tipo: TIPOS_PROMO.COMBO_PRECIO_FIJO,
    precio_combo: 22000,
    activa: true,
    combo_items: [
      { receta_id: "chipa", cantidad: 4 },
      { receta_id: "pizza", cantidad: 1 },
      { receta_id: "emp", cantidad: 6 },
    ],
    receta_ids: ["chipa", "pizza", "emp"],
  };

  const recetaChipa = { id: "chipa", nombre: "Chipa 100g", precio_venta: 1500 };
  const recetaPizza = { id: "pizza", nombre: "Pizza", precio_venta: 9500 };
  const recetaEmp = { id: "emp", nombre: "Empanada", precio_venta: 1500 };

  it("aplica descuento cuando el carrito cumple el combo exacto", () => {
    const cart = [
      { receta: recetaChipa, cantidad: 4, precio_unitario: 1500 },
      { receta: recetaPizza, cantidad: 1, precio_unitario: 9500 },
      { receta: recetaEmp, cantidad: 6, precio_unitario: 1500 },
    ];
    const r = calcularPromosEnCarrito(cart, [promoCombo]);
    expect(r.descuentoTotal).toBe(2500);
    expect(r.totalFinal).toBe(22000);
  });

  it("no aplica si falta un producto del combo", () => {
    const cart = [
      { receta: recetaChipa, cantidad: 4, precio_unitario: 1500 },
      { receta: recetaPizza, cantidad: 1, precio_unitario: 9500 },
    ];
    const r = calcularPromosEnCarrito(cart, [promoCombo]);
    expect(r.descuentoTotal).toBe(0);
  });

  it("aplica un combo y cobra el resto a precio lista", () => {
    const cart = [
      { receta: recetaChipa, cantidad: 8, precio_unitario: 1500 },
      { receta: recetaPizza, cantidad: 1, precio_unitario: 9500 },
      { receta: recetaEmp, cantidad: 6, precio_unitario: 1500 },
    ];
    const r = calcularPromosEnCarrito(cart, [promoCombo]);
    expect(r.descuentoTotal).toBe(2500);
    expect(r.totalFinal).toBe(28000);
  });

  it("puede aplicar dos combos si hay cantidades suficientes", () => {
    const cart = [
      { receta: recetaChipa, cantidad: 8, precio_unitario: 1500 },
      { receta: recetaPizza, cantidad: 2, precio_unitario: 9500 },
      { receta: recetaEmp, cantidad: 12, precio_unitario: 1500 },
    ];
    const r = calcularPromosEnCarrito(cart, [promoCombo]);
    expect(r.descuentoTotal).toBe(5000);
    expect(r.totalFinal).toBe(44000);
  });
});

describe("excluir promos en cobro", () => {
  it("no aplica promo excluida", () => {
    const cart = [{ receta: recetaA, cantidad: 5, precio_unitario: 100 }];
    const r = calcularPromosEnCarrito(cart, [promo5x4], {
      excludePromoIds: ["p1"],
    });
    expect(r.descuentoTotal).toBe(0);
    expect(r.totalFinal).toBe(500);
  });
});

describe("promos exclusivas por cliente", () => {
  const promoExclusiva = {
    id: "pe",
    nombre: "Solo VIP",
    tipo: TIPOS_PROMO.PORCENTAJE_PRODUCTOS,
    porcentaje: 20,
    activa: true,
    receta_ids: ["a"],
    alcance: ALCANCE_PROMO.CLIENTES,
    cliente_ids: ["cli-1", "cli-2"],
  };
  const cart = [{ receta: recetaA, cantidad: 2, precio_unitario: 1000 }];

  it("no aplica sin cliente seleccionado", () => {
    const r = calcularPromosEnCarrito(cart, [promoExclusiva]);
    expect(r.descuentoTotal).toBe(0);
    expect(r.totalFinal).toBe(2000);
  });

  it("no aplica si el cliente no está en la whitelist", () => {
    const r = calcularPromosEnCarrito(cart, [promoExclusiva], { clienteId: "otro" });
    expect(r.descuentoTotal).toBe(0);
  });

  it("aplica cuando el cliente está habilitado", () => {
    const r = calcularPromosEnCarrito(cart, [promoExclusiva], { clienteId: "cli-1" });
    expect(r.descuentoTotal).toBe(400);
    expect(r.totalFinal).toBe(1600);
  });

  it("las promos globales siguen aplicando sin cliente", () => {
    const global20 = { ...promoExclusiva, id: "pg", alcance: ALCANCE_PROMO.TODOS, cliente_ids: [] };
    const r = calcularPromosEnCarrito(cart, [global20]);
    expect(r.descuentoTotal).toBe(400);
  });

  it("promoAplicaACliente respeta el alcance", () => {
    expect(promoAplicaACliente({ alcance: ALCANCE_PROMO.TODOS }, null)).toBe(true);
    expect(promoAplicaACliente(promoExclusiva, null)).toBe(false);
    expect(promoAplicaACliente(promoExclusiva, "cli-2")).toBe(true);
    expect(promoAplicaACliente(promoExclusiva, "x")).toBe(false);
  });
});

describe("normalizarPromociones con clientes", () => {
  it("extrae cliente_ids del join y default alcance 'todos'", () => {
    const [p] = normalizarPromociones([
      {
        id: "p1",
        nombre: "X",
        tipo: TIPOS_PROMO.NXM,
        activa: true,
        alcance: ALCANCE_PROMO.CLIENTES,
        promocion_recetas: [{ receta_id: "a", cantidad: 1 }],
        promocion_clientes: [{ cliente_id: "c1" }, { cliente_id: "c2" }],
      },
    ]);
    expect(p.cliente_ids).toEqual(["c1", "c2"]);
    expect(p.alcance).toBe(ALCANCE_PROMO.CLIENTES);
    expect(p.promocion_clientes).toBeUndefined();
  });

  it("sin alcance queda 'todos' y cliente_ids vacío", () => {
    const [p] = normalizarPromociones([
      { id: "p2", nombre: "Y", tipo: TIPOS_PROMO.NXM, activa: true },
    ]);
    expect(p.alcance).toBe(ALCANCE_PROMO.TODOS);
    expect(p.cliente_ids).toEqual([]);
  });
});

describe("varias promos mismo producto", () => {
  it("suma descuentos de dos promos sobre el mismo producto", () => {
    const promoNxM = { ...promo5x4, id: "p1" };
    const promo20 = {
      id: "p2",
      nombre: "20%",
      tipo: TIPOS_PROMO.PORCENTAJE_PRODUCTOS,
      porcentaje: 20,
      activa: true,
      receta_ids: ["a"],
    };
    const cart = [{ receta: recetaA, cantidad: 5, precio_unitario: 100 }];
    const r = calcularPromosEnCarrito(cart, [promoNxM, promo20]);
    expect(r.descuentoTotal).toBe(200);
    expect(r.aplicadas).toHaveLength(2);
  });
});
