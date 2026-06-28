import {
  costoReceta,
  costoDesdeIngredientes,
  costoUnitarioPorRecetaMap,
} from "./costos";
import {
  costosParaRecetaYCadena,
  advertenciasCosteoIngredientes,
} from "./recetaCostoCascade";

const insumos = [
  { id: "prem", nombre: "Premezcla brownie", precio: 5000, cantidad_presentacion: 1000, unidad: "g" },
  { id: "huevo", nombre: "Huevos", precio: 3000, cantidad_presentacion: 30, unidad: "u" },
  { id: "manteca", nombre: "Manteca", precio: 4000, cantidad_presentacion: 200, unidad: "g" },
  { id: "harina", nombre: "Harina", precio: 2000, cantidad_presentacion: 1000, unidad: "g" },
];

describe("costos con masas jerárquicas", () => {
  const recetasFlat = [{ id: "brownie", nombre: "Brownie", rinde: 1, precio_venta: 2500, es_precursora: false }];
  const ingsFlat = [
    { receta_id: "brownie", insumo_id: "prem", cantidad: 95, unidad: "g" },
    { receta_id: "brownie", insumo_id: "huevo", cantidad: 2, unidad: "u" },
    { receta_id: "brownie", insumo_id: "manteca", cantidad: 80, unidad: "g" },
  ];

  const recetasChain = [
    {
      id: "mb",
      nombre: "Masa Brownie",
      rinde: 1,
      es_precursora: true,
      gramos_por_unidad: 175,
      oculto_en_venta: true,
      precio_venta: 0,
    },
    { id: "brownie2", nombre: "Brownie", rinde: 1, precio_venta: 2500, es_precursora: false },
  ];
  const ingsChain = [
    { receta_id: "mb", insumo_id: "prem", cantidad: 95, unidad: "g" },
    { receta_id: "mb", insumo_id: "huevo", cantidad: 2, unidad: "u" },
    { receta_id: "mb", insumo_id: "manteca", cantidad: 80, unidad: "g" },
    { receta_id: "brownie2", receta_id_precursora: "mb", cantidad: 175, unidad: "g" },
  ];

  test("costo flat vs masa+producto es equivalente", () => {
    const flat = costoReceta("brownie", ingsFlat, insumos, recetasFlat);
    const chain = costoReceta("brownie2", ingsChain, insumos, recetasChain);
    expect(chain).toBeCloseTo(flat, 2);
  });

  test("precio_venta no cambia al reestructurar (solo producto)", () => {
    expect(recetasChain[1].precio_venta).toBe(2500);
    expect(recetasChain[0].precio_venta).toBe(0);
  });

  test("cadena Sablée base → 45g → Pastafrola", () => {
    const recetas = [
      { id: "ms", nombre: "Masa Sablée", rinde: 1, es_precursora: true, gramos_por_unidad: 1000 },
      { id: "ms45", nombre: "Masa 45g", rinde: 1, es_precursora: true, gramos_por_unidad: 45 },
      { id: "pf", nombre: "Pastafrola", rinde: 1, precio_venta: 1200, es_precursora: false },
    ];
    const ings = [
      { receta_id: "ms", insumo_id: "harina", cantidad: 500, unidad: "g" },
      { receta_id: "ms", insumo_id: "manteca", cantidad: 250, unidad: "g" },
      { receta_id: "ms45", receta_id_precursora: "ms", cantidad: 45, unidad: "g" },
      { receta_id: "pf", receta_id_precursora: "ms45", cantidad: 1, unidad: "u" },
    ];
    const costoPf = costoReceta("pf", ings, insumos, recetas);
    const costoDirecto45 = costoReceta("ms45", ings, insumos, recetas) / 1;
    expect(costoPf).toBeCloseTo(costoDirecto45, 2);
    expect(costoPf).toBeGreaterThan(0);
  });

  test("sin gramos_por_unidad el costo en gramos no se calcula", () => {
    const recetas = [
      { id: "mb", nombre: "Masa", rinde: 1, es_precursora: true, gramos_por_unidad: null },
      { id: "p", nombre: "Prod", rinde: 1, es_precursora: false },
    ];
    const ings = [
      { receta_id: "mb", insumo_id: "prem", cantidad: 100, unidad: "g" },
      { receta_id: "p", receta_id_precursora: "mb", cantidad: 80, unidad: "g" },
    ];
    const formIngs = [{ receta_id_precursora: "mb", cantidad: "80", unidad: "g" }];
    const avisos = advertenciasCosteoIngredientes(formIngs, insumos, recetas, ings);
    expect(avisos.some((a) => /gramos por unidad/i.test(a))).toBe(true);
    expect(costoDesdeIngredientes(formIngs, insumos, recetas, ings)).toBe(0);
  });

  test("propaga costos a productos hijos al cambiar masa", () => {
    const recetas = [
      { id: "mb", nombre: "Masa Brownie", rinde: 1, es_precursora: true, gramos_por_unidad: 175 },
      { id: "b1", nombre: "Brownie porción", rinde: 1, es_precursora: false },
      { id: "b2", nombre: "Brownie 20cm", rinde: 1, es_precursora: false },
    ];
    const ings = [
      { receta_id: "mb", insumo_id: "prem", cantidad: 95, unidad: "g" },
      { receta_id: "b1", receta_id_precursora: "mb", cantidad: 175, unidad: "g" },
      { receta_id: "b2", receta_id_precursora: "mb", cantidad: 700, unidad: "g" },
    ];
    const updates = costosParaRecetaYCadena("mb", recetas, ings, insumos);
    expect(updates.map((u) => String(u.id)).sort()).toEqual(["b1", "b2", "mb"]);
    expect(updates.find((u) => u.id === "b1").costo_unitario).toBeGreaterThan(0);
  });

  test("costoUnitarioPorRecetaMap usa cálculo cuando cache está en 0", () => {
    const recetas = [
      { id: "mb", nombre: "Masa", rinde: 1, es_precursora: true, gramos_por_unidad: 100, costo_unitario: 0 },
      { id: "p", nombre: "Prod", rinde: 1, precio_venta: 500, costo_unitario: 0 },
    ];
    const ings = [
      { receta_id: "mb", insumo_id: "prem", cantidad: 100, unidad: "g" },
      { receta_id: "p", receta_id_precursora: "mb", cantidad: 100, unidad: "g" },
    ];
    const map = costoUnitarioPorRecetaMap(recetas, ings, insumos);
    expect(map.p).toBeGreaterThan(0);
  });
});

describe("costo fijo vs precursora real", () => {
  test("precursora enlazada puede diferir del costo_fijo anterior", () => {
    const insumosLocal = [{ id: "harina", nombre: "Harina", precio: 2000, cantidad_presentacion: 1000, unidad: "g" }];
    const recetas = [
      { id: "ms", nombre: "Masa Sablée", rinde: 1, es_precursora: true, gramos_por_unidad: 60 },
      { id: "pf", nombre: "Pastafrola", rinde: 1, precio_venta: 1200 },
    ];
    const ingsFijo = [{ receta_id: "pf", costo_fijo: 240 }];
    const ingsReal = [
      { receta_id: "ms", insumo_id: "harina", cantidad: 60, unidad: "g" },
      { receta_id: "pf", receta_id_precursora: "ms", cantidad: 60, unidad: "g" },
    ];
    const costoFijo = costoReceta("pf", ingsFijo, insumosLocal, recetas);
    const costoReal = costoReceta("pf", ingsReal, insumosLocal, recetas);
    expect(costoFijo).toBe(240);
    expect(costoReal).toBeCloseTo(120, 0);
    expect(costoReal).not.toBe(costoFijo);
  });
});
