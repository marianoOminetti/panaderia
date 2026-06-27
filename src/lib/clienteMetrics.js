/**
 * Métricas de clientes: frecuencia, favoritos, nuevos, inactivos.
 * Usado por pantalla Clientes, detalle de cliente e insights.
 */
import { agruparVentas } from "./agrupadores";
import { montoVentaLinea } from "./analyticsDrillHelpers";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function parseISODate(d) {
  if (!d) return null;
  const parts = String(d).split("-");
  if (parts.length === 3) {
    const [y, m, day] = parts.map((x) => parseInt(x, 10));
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(day)) {
      return new Date(y, m - 1, day);
    }
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function diasEntre(desde, hasta) {
  if (!desde || !hasta) return null;
  return Math.floor((hasta.getTime() - desde.getTime()) / MS_POR_DIA);
}

function formatHaceDias(dias) {
  if (dias == null) return "—";
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) return `hace ${Math.floor(dias / 7)} sem`;
  if (dias < 365) return `hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) > 1 ? "es" : ""}`;
  return `hace ${Math.floor(dias / 365)} año${Math.floor(dias / 365) > 1 ? "s" : ""}`;
}

export function indexVentasPorCliente(ventas) {
  const map = new Map();
  for (const v of ventas || []) {
    if (v.cliente_id == null) continue;
    const list = map.get(v.cliente_id) ?? [];
    list.push(v);
    map.set(v.cliente_id, list);
  }
  return map;
}

function fechasCompraDesdeVentas(ventasCliente) {
  const grupos = agruparVentas(ventasCliente || []);
  const fechas = grupos
    .map((g) => {
      const ref = g.rawItems?.[0]?.fecha || g.rawItems?.[0]?.created_at;
      return parseISODate(ref);
    })
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());
  return { grupos, fechas, count: grupos.length, ventas: ventasCliente || [] };
}

function calcularFrecuencia(fechas) {
  if (!fechas.length) {
    return { avgDays: null, label: "Sin compras" };
  }
  if (fechas.length === 1) {
    return { avgDays: null, label: "Primera compra" };
  }
  const gaps = [];
  for (let i = 1; i < fechas.length; i++) {
    gaps.push((fechas[i].getTime() - fechas[i - 1].getTime()) / MS_POR_DIA);
  }
  const avgDays = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  let label;
  if (avgDays <= 7) label = `~cada ${Math.max(1, Math.round(avgDays))} días`;
  else if (avgDays <= 14) label = "~cada 2 semanas";
  else if (avgDays <= 31) label = "~mensual";
  else if (avgDays <= 60) label = "~cada 2 meses";
  else label = "esporádico";
  return { avgDays, label };
}

function productosFavoritosDesdeVentas(ventasCliente, recetas, limit = 3) {
  const map = new Map();
  for (const v of ventasCliente || []) {
    if (v.receta_id == null) continue;
    const prev = map.get(v.receta_id) || { unidades: 0, ingreso: 0 };
    prev.unidades += Number(v.cantidad) || 0;
    prev.ingreso += montoVentaLinea(v);
    map.set(v.receta_id, prev);
  }
  return [...map.entries()]
    .map(([receta_id, stats]) => ({
      receta_id,
      receta: (recetas || []).find((r) => r.id === receta_id) || { nombre: "?" },
      ...stats,
    }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, limit);
}

export function productosFavoritosCliente(ventas, recetas, clienteId, limit = 3) {
  const vs = (ventas || []).filter((v) => v.cliente_id === clienteId);
  return productosFavoritosDesdeVentas(vs, recetas, limit);
}

/**
 * Perfil completo de un cliente para el detalle.
 */
export function buildPerfilCliente(ventas, recetas, cliente, hoy = new Date()) {
  const vs = (ventas || []).filter((v) => v.cliente_id === cliente.id);
  return buildPerfilFromVentas(vs, recetas, cliente, hoy);
}

export function buildPerfilFromVentas(ventasCliente, recetas, cliente, hoy = new Date()) {
  const { grupos, fechas, count, ventas: vs } = fechasCompraDesdeVentas(ventasCliente);
  const total = vs.reduce((s, v) => s + montoVentaLinea(v), 0);
  const unidades = vs.reduce((s, v) => s + (Number(v.cantidad) || 0), 0);
  const primeraCompra = fechas[0] || null;
  const ultimaCompra = fechas.length ? fechas[fechas.length - 1] : null;
  const diasDesdeUltima = diasEntre(ultimaCompra, hoy);
  const diasDesdePrimera = diasEntre(primeraCompra, hoy);
  const { avgDays, label: frecuenciaLabel } = calcularFrecuencia(fechas);
  const favoritos = productosFavoritosDesdeVentas(vs, recetas, 5);
  const ticketPromedio = count > 0 ? total / count : 0;
  const esNuevo =
    count > 0 && diasDesdePrimera != null && diasDesdePrimera <= 30;
  const inactivo = count >= 2 && diasDesdeUltima != null && diasDesdeUltima > 14;

  return {
    total,
    unidades,
    compras: count,
    primeraCompra,
    ultimaCompra,
    diasDesdeUltima,
    ultimaCompraLabel: formatHaceDias(diasDesdeUltima),
    frecuenciaLabel,
    avgDaysBetween: avgDays,
    favoritos,
    ticketPromedio,
    esNuevo,
    inactivo,
    activoReciente: diasDesdeUltima != null && diasDesdeUltima <= 7,
    grupos,
  };
}

/**
 * Enriquece lista de clientes con métricas para filas y filtros.
 */
export function enrichClientesConMetricas(clientes, ventasPorCliente, recetas, hoy = new Date()) {
  return (clientes || []).map((c) => {
    const vs = ventasPorCliente.get(c.id) ?? [];
    const perfil = buildPerfilFromVentas(vs, recetas, c, hoy);
    const favorito = perfil.favoritos[0]?.receta;
    return {
      ...c,
      total: perfil.total,
      unidades: perfil.unidades,
      ventas: perfil.compras,
      ultimaCompra: perfil.ultimaCompra,
      diasDesdeUltima: perfil.diasDesdeUltima,
      ultimaCompraLabel: perfil.ultimaCompraLabel,
      frecuenciaLabel: perfil.frecuenciaLabel,
      favorito,
      favoritos: perfil.favoritos,
      ticketPromedio: perfil.ticketPromedio,
      esNuevo: perfil.esNuevo,
      inactivo: perfil.inactivo,
      activoReciente: perfil.activoReciente,
    };
  });
}

/**
 * Resumen para la pantalla Clientes: nuevos, activos, inactivos, fieles.
 */
export function buildClientesResumen(clientesEnriquecidos) {
  const conCompras = clientesEnriquecidos.filter((c) => c.ventas > 0);
  const nuevos = conCompras.filter((c) => c.esNuevo);
  const activosSemana = conCompras.filter((c) => c.activoReciente);
  const inactivos = conCompras.filter((c) => c.inactivo);
  const sinCompras = clientesEnriquecidos.filter((c) => c.ventas === 0);

  const fieles = [...conCompras]
    .filter((c) => c.ventas >= 3)
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 5);

  const topGasto = [...conCompras].sort((a, b) => b.total - a.total).slice(0, 5);

  return {
    total: clientesEnriquecidos.length,
    conCompras: conCompras.length,
    nuevos,
    activosSemana,
    inactivos,
    sinCompras,
    fieles,
    topGasto,
  };
}

export { formatHaceDias, diasEntre, parseISODate };
