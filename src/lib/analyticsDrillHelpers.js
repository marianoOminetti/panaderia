/**
 * Agregaciones para drill-down de Analytics (mismo criterio de monto/costo que useAnalyticsData).
 */
import { costoUnitarioPorRecetaMap } from "./costos";
import { agruparVentas } from "./agrupadores";

export function montoVentaLinea(v) {
  return v.total_final != null
    ? v.total_final
    : (v.precio_unitario || 0) * (v.cantidad || 0);
}

export function makeGetCostoLinea(recetas, recetaIngredientes, insumos) {
  const costoUnitarioPorReceta = costoUnitarioPorRecetaMap(
    recetas || [],
    recetaIngredientes || [],
    insumos || []
  );
  return (v) => {
    const cu = costoUnitarioPorReceta[v.receta_id];
    if (cu == null) return 0;
    const cant = Number(v.cantidad) || 0;
    return cu * cant;
  };
}

/**
 * @returns {Array<{ receta_id, receta, unidades, ingreso, costo, ganancia, margen }>}
 */
export function aggregateProductosPeriodo(ventas, recetas, getCostoLinea) {
  const map = new Map();
  for (const v of ventas || []) {
    const key = v.receta_id != null ? String(v.receta_id) : "__sin_receta__";
    const ingreso = montoVentaLinea(v);
    const costo = getCostoLinea(v);
    const prev = map.get(key) || {
      receta_id: v.receta_id,
      unidades: 0,
      ingreso: 0,
      costo: 0,
    };
    prev.unidades += Number(v.cantidad) || 0;
    prev.ingreso += ingreso;
    prev.costo += costo;
    map.set(key, prev);
  }
  const rows = [];
  for (const row of map.values()) {
    const rec =
      row.receta_id != null
        ? (recetas || []).find((r) => r.id === row.receta_id) || {}
        : { nombre: "Sin producto asignado", emoji: "—" };
    const ganancia = row.ingreso - row.costo;
    const margen = row.ingreso > 0 ? ganancia / row.ingreso : null;
    rows.push({
      ...row,
      receta: rec,
      ganancia,
      margen,
    });
  }
  return rows;
}

/**
 * @returns {Array<{ cliente_id, cliente, total, lineas }>} ordenado por total desc
 */
export function aggregateClientesPeriodo(ventas, clientes) {
  const map = new Map();
  for (const v of ventas || []) {
    const cid = v.cliente_id == null ? "__sin_cliente__" : String(v.cliente_id);
    const ingreso = montoVentaLinea(v);
    const prev = map.get(cid) || {
      cliente_id: v.cliente_id,
      total: 0,
      lineas: 0,
    };
    prev.total += ingreso;
    prev.lineas += 1;
    map.set(cid, prev);
  }
  const rows = [];
  for (const row of map.values()) {
    const cliente =
      row.cliente_id == null
        ? { nombre: "Consumidor final" }
        : (clientes || []).find((c) => c.id === row.cliente_id) || {
            nombre: "Cliente desconocido",
          };
    rows.push({ ...row, cliente });
  }
  rows.sort((a, b) => b.total - a.total);
  return rows;
}

/**
 * Por cada cliente (misma clave que aggregateClientesPeriodo), lista de productos en el período.
 * @returns {Map<string, Array<{ receta_id, receta, unidades, ingreso }>>}
 */
export function productosPorClienteEnPeriodo(ventas, recetas) {
  const porCliente = new Map();
  for (const v of ventas || []) {
    const cid = v.cliente_id == null ? "__sin_cliente__" : String(v.cliente_id);
    const porReceta = porCliente.get(cid) || new Map();
    const rk = v.receta_id != null ? String(v.receta_id) : "__sin_receta__";
    const ingreso = montoVentaLinea(v);
    const prev = porReceta.get(rk) || {
      receta_id: v.receta_id,
      unidades: 0,
      ingreso: 0,
    };
    prev.unidades += Number(v.cantidad) || 0;
    prev.ingreso += ingreso;
    porReceta.set(rk, prev);
    porCliente.set(cid, porReceta);
  }
  const out = new Map();
  for (const [cid, recMap] of porCliente) {
    const rows = [];
    for (const r of recMap.values()) {
      const rec =
        r.receta_id != null
          ? (recetas || []).find((x) => x.id === r.receta_id) || {}
          : { nombre: "Sin producto asignado", emoji: "—" };
      rows.push({ ...r, receta: rec });
    }
    rows.sort((a, b) => b.ingreso - a.ingreso);
    out.set(cid, rows);
  }
  return out;
}

export function gruposVentasPeriodo(ventas) {
  return agruparVentas(ventas || []);
}
