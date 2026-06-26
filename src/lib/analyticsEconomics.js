/**
 * Métricas económicas por período para Analytics.
 * costoMateriaPrima = insumos/recetas; gastosNegocio = alquiler, servicios, etc.
 */
export function buildPeriodoEconomico({
  ingreso = 0,
  costoMateriaPrima = 0,
  gastosNegocio = 0,
}) {
  const mp = costoMateriaPrima || 0;
  const gastos = gastosNegocio || 0;
  const costoTotal = mp + gastos;
  const gananciaBruta = ingreso - mp;
  const gananciaNeta = ingreso - costoTotal;
  const margenBruto = ingreso > 0 ? gananciaBruta / ingreso : null;
  const margenNeto = ingreso > 0 ? gananciaNeta / ingreso : null;

  return {
    ingreso,
    costoMateriaPrima: mp,
    gastosNegocio: gastos,
    costoTotal,
    gananciaBruta,
    gananciaNeta,
    margenBruto,
    margenNeto,
  };
}
