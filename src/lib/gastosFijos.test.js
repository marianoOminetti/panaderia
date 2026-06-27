import {
  calcularGastosTotales,
  calcularGastosEnPeriodo,
  calcularGastosFijosEnRango,
  desglosarGastosEnPeriodo,
} from "./gastosFijos";

describe("calcularGastosFijosEnRango", () => {
  it("prorratea fijos que empiezan a mitad de mes", () => {
    const gastos = [
      {
        nombre: "Esponjas",
        tipo: "fijo",
        monto: 8000,
        frecuencia: "mensual",
        fecha_inicio_vigencia: "2026-03-03",
      },
      {
        nombre: "Limpia piso",
        tipo: "fijo",
        monto: 18000,
        frecuencia: "mensual",
        fecha_inicio_vigencia: "2026-03-03",
      },
    ];
    const desde = new Date(2026, 2, 1);
    const hasta = new Date(2026, 2, 31, 23, 59, 59, 999);

    const total = calcularGastosFijosEnRango(gastos, desde, hasta);
    // 29 días (3–31 mar): (8000 + 18000) / 30 * 29
    expect(total).toBeCloseTo((26000 / 30) * 29, 2);
  });

  it("prorratea fijos que terminan a mitad de mes", () => {
    const gastos = [
      {
        nombre: "Luz",
        tipo: "fijo",
        monto: 218000,
        frecuencia: "mensual",
        fecha_inicio_vigencia: "2026-05-31",
        fecha_fin_vigencia: "2026-06-29",
      },
    ];
    const desde = new Date(2026, 5, 1);
    const hasta = new Date(2026, 5, 30, 23, 59, 59, 999);

    const total = calcularGastosFijosEnRango(gastos, desde, hasta);
    // Vigente 1–28 jun (29 exclusivo): 28 días
    expect(total).toBeCloseTo((218000 / 30) * 28, 2);
  });

  it("no cuenta desde la fecha de fin ni en meses posteriores", () => {
    const gastos = [
      {
        nombre: "Luz",
        tipo: "fijo",
        monto: 218000,
        frecuencia: "mensual",
        fecha_inicio_vigencia: "2026-05-31",
        fecha_fin_vigencia: "2026-06-29",
      },
    ];
    const { dia: diaFin } = calcularGastosTotales(gastos, new Date(2026, 5, 29));
    const { dia: diaAntes } = calcularGastosTotales(gastos, new Date(2026, 5, 28));
    expect(diaFin).toBe(0);
    expect(diaAntes).toBeCloseTo(218000 / 30, 2);

    const julio = calcularGastosEnPeriodo(
      gastos,
      new Date(2026, 6, 1),
      new Date(2026, 6, 31, 23, 59, 59, 999)
    ).total;
    expect(julio).toBe(0);
  });

  it("cuenta semana parcial si el fijo arranca mid-week", () => {
    const gastos = [
      {
        nombre: "Sueldo",
        tipo: "fijo",
        monto: 140000,
        frecuencia: "semanal",
        fecha_inicio_vigencia: "2026-06-21", // sábado
      },
    ];
    const weekStart = new Date(2026, 5, 15); // lun 15 jun
    const weekEnd = new Date(2026, 5, 21, 23, 59, 59, 999); // dom 21 jun

    const total = calcularGastosFijosEnRango(gastos, weekStart, weekEnd);
    // Solo sáb 21 y dom... wait 21 is Saturday, vigente from 21 inclusive
    // Days in week Mon 15 - Sun 21: only Sat 21 = 1 day at 140000/7
    expect(total).toBeCloseTo(140000 / 7, 2);
  });
});

describe("calcularGastosEnPeriodo", () => {
  it("incluye puntuales dentro del rango", () => {
    const gastos = [
      {
        nombre: "Extra",
        tipo: "puntual",
        monto: 5000,
        fecha: "2026-04-01",
      },
    ];
    const total = calcularGastosEnPeriodo(
      gastos,
      new Date(2026, 3, 1),
      new Date(2026, 3, 30, 23, 59, 59, 999)
    ).total;
    expect(total).toBe(5000);
  });
});

describe("desglosarGastosEnPeriodo", () => {
  it("lista cada gasto con importe prorrateado en el rango", () => {
    const gastos = [
      {
        id: "1",
        nombre: "Esponjas",
        tipo: "fijo",
        monto: 8000,
        frecuencia: "mensual",
        fecha_inicio_vigencia: "2026-03-03",
      },
      {
        id: "2",
        nombre: "Extra",
        tipo: "puntual",
        monto: 5000,
        fecha: "2026-03-15",
      },
    ];
    const rows = desglosarGastosEnPeriodo(
      gastos,
      new Date(2026, 2, 1),
      new Date(2026, 2, 31, 23, 59, 59, 999)
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.nombre === "Esponjas")?.importe).toBeCloseTo(
      (8000 / 30) * 29,
      2
    );
    expect(rows.find((r) => r.nombre === "Extra")?.importe).toBe(5000);
  });

  it("omite gastos fuera de vigencia en el rango", () => {
    const gastos = [
      {
        id: "1",
        nombre: "Luz",
        tipo: "fijo",
        monto: 218000,
        frecuencia: "mensual",
        fecha_inicio_vigencia: "2026-05-31",
        fecha_fin_vigencia: "2026-06-29",
      },
    ];
    const rows = desglosarGastosEnPeriodo(
      gastos,
      new Date(2026, 6, 1),
      new Date(2026, 6, 31, 23, 59, 59, 999)
    );
    expect(rows).toHaveLength(0);
  });
});

describe("calcularGastosTotales", () => {
  it("mes usa vigencia día a día, no solo el 1° del mes", () => {
    const gastos = [
      {
        nombre: "Esponjas",
        tipo: "fijo",
        monto: 8000,
        frecuencia: "mensual",
        fecha_inicio_vigencia: "2026-03-03",
      },
    ];
    const { mes } = calcularGastosTotales(gastos, new Date(2026, 2, 1));
    expect(mes).toBeCloseTo((8000 / 30) * 29, 2);
    expect(mes).toBeGreaterThan(0);
  });
});
