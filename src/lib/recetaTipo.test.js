import {
  getTipoReceta,
  TIPO_RECETA,
  groupProductosPorFamilia,
  collectFamilias,
} from "./recetaTipo";

describe("recetaTipo", () => {
  const recetaIngredientes = [
    { receta_id: "ms45", receta_id_precursora: "ms", cantidad: 45, unidad: "g" },
    { receta_id: "pf", receta_id_precursora: "ms45", cantidad: 1, unidad: "u" },
  ];

  test("getTipoReceta distingue masa base, porcionada y producto", () => {
    expect(getTipoReceta({ id: "ms", es_precursora: true }, [])).toBe(TIPO_RECETA.MASA_BASE);
    expect(getTipoReceta({ id: "ms45", es_precursora: true }, recetaIngredientes)).toBe(
      TIPO_RECETA.MASA_PORCIONADA,
    );
    expect(getTipoReceta({ id: "pf", es_precursora: false }, recetaIngredientes)).toBe(
      TIPO_RECETA.PRODUCTO,
    );
  });

  test("groupProductosPorFamilia agrupa y ordena", () => {
    const productos = [
      { id: "b2", nombre: "B 20CM", familia: "Brownie" },
      { id: "b1", nombre: "B PORCION", familia: "Brownie" },
      { id: "x", nombre: "PAN" },
    ];
    const grupos = groupProductosPorFamilia(productos);
    expect(grupos).toHaveLength(2);
    expect(grupos[0].familia).toBe("Brownie");
    expect(grupos[0].items).toHaveLength(2);
    expect(grupos[1].familia).toBeNull();
  });

  test("collectFamilias devuelve únicas ordenadas", () => {
    expect(
      collectFamilias([
        { familia: "Pastafrola" },
        { familia: "Brownie" },
        { familia: "Brownie" },
      ]),
    ).toEqual(["Brownie", "Pastafrola"]);
  });
});
