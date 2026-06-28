import { planDaysForWeek, planItemsForDay, compraGroupsForShare, buildCompraWhatsAppText } from "./planShare";

const receta = (id, nombre, opts = {}) => ({
  id,
  nombre,
  emoji: "🥐",
  es_precursora: false,
  unidad_rinde: "u",
  ...opts,
});

describe("planShare", () => {
  const weekStart = "2026-06-27"; // sábado

  test("planItemsForDay filtra y ordena masas antes que productos", () => {
    const cart = [
      { receta: receta(1, "Pan"), cantidad: 5, porDia: [0, 0, 5, 0, 0, 0, 0] },
      { receta: receta(2, "Masa madre", { es_precursora: true }), cantidad: 2, porDia: [2, 0, 0, 0, 0, 0, 0] },
    ];
    const items = planItemsForDay(cart, 0);
    expect(items).toHaveLength(1);
    expect(items[0].nombre).toBe("Masa madre");
    expect(items[0].tipo).toBe("Masa");
  });

  test("planDaysForWeek omite días vacíos", () => {
    const cart = [
      { receta: receta(1, "Pan"), cantidad: 3, porDia: [0, 0, 3, 0, 0, 0, 0] },
    ];
    const days = planDaysForWeek(cart, weekStart);
    expect(days).toHaveLength(1);
    expect(days[0].dia).toBe("Lunes");
    expect(days[0].items[0].qty).toBe(3);
  });

  test("compraGroupsForShare agrupa por proveedor", () => {
    const items = [
      { insumo: { nombre: "Harina", proveedor: "Molino", unidad: "kg" }, faltante: 5, costo: 100 },
      { insumo: { nombre: "Azúcar", proveedor: "Molino", unidad: "kg" }, faltante: 2, costo: 50 },
    ];
    const groups = compraGroupsForShare(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });

  test("buildCompraWhatsAppText incluye ítems y total", () => {
    const items = [
      { insumo: { nombre: "Harina", proveedor: "Molino", unidad: "kg" }, faltante: 5, costo: 100 },
    ];
    const text = buildCompraWhatsAppText(items, "1/7 al 7/7");
    expect(text).toContain("Harina");
    expect(text).toContain("5.00 kg");
    expect(text).toContain("Estimado:");
  });
});
