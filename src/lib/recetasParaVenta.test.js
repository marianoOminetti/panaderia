import {
  fechaHaceDiasISO,
  prepararRecetasParaVenta,
  unidadesVendidasUltimos7Dias,
} from "./recetasParaVenta";

describe("recetasParaVenta", () => {
  const recetas = [
    { id: "a", nombre: "Zebra", oculto_en_venta: false },
    { id: "b", nombre: "Alfa", oculto_en_venta: false },
    { id: "c", nombre: "Oculta", oculto_en_venta: true },
  ];

  test("fechaHaceDiasISO resta días en calendario local", () => {
    expect(fechaHaceDiasISO("2026-06-02", 6)).toBe("2026-05-27");
  });

  test("oculta recetas con oculto_en_venta", () => {
    const out = prepararRecetasParaVenta(recetas, [], "2026-06-02");
    expect(out.map((r) => r.id)).toEqual(["b", "a"]);
  });

  test("ordena por unidades 7d y sin ventas al fondo", () => {
    const ventas = [
      { receta_id: "a", cantidad: 10, fecha: "2026-06-02" },
      { receta_id: "b", cantidad: 2, fecha: "2026-06-01" },
    ];
    const out = prepararRecetasParaVenta(recetas, ventas, "2026-06-02");
    expect(out.map((r) => r.id)).toEqual(["a", "b"]);
  });

  test("unidadesVendidasUltimos7Dias incluye hoy y 6 días previos", () => {
    const ventas = [
      { receta_id: "a", cantidad: 1, fecha: "2026-05-27" },
      { receta_id: "a", cantidad: 1, fecha: "2026-05-26" },
    ];
    const map = unidadesVendidasUltimos7Dias(ventas, "2026-06-02");
    expect(map.get("a")).toBe(1);
  });
});
