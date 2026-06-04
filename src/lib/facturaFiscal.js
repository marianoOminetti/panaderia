/** transaccion_id del grupo de ventas, o null si es venta suelta sin agrupar */
export function getTransaccionIdFromGrupo(grupo) {
  const tid = grupo?.rawItems?.[0]?.transaccion_id;
  return tid || null;
}

export function facturaListaParaPdf(factura) {
  if (!factura?.cae) return false;
  return (
    factura.estado === "autorizada" ||
    factura.estado === "mock" ||
    factura.estado === "error"
  );
}

export function facturaPuedeReintentarAfip(factura) {
  if (!factura) return true;
  if (factura.estado === "pendiente") return true;
  if (factura.estado === "error" && !factura.cae) return true;
  return false;
}

export function buildFacturaFiscalData(grupo, factura, recetas, clientes) {
  const ejemplo = grupo.rawItems?.[0] || grupo.items?.[0];
  const cliente = (clientes || []).find((c) => c.id === grupo.cliente_id);
  const lineas = grupo.rawItems?.length ? grupo.rawItems : grupo.items;
  const items = lineas.map((v) => {
    const r = (recetas || []).find((r2) => r2.id === v.receta_id);
    return {
      receta_id: v.receta_id,
      receta: r ? { nombre: r.nombre, emoji: r.emoji } : null,
      cantidad: v.cantidad,
      precio_unitario: v.precio_unitario,
      _lineTotal:
        v.total_final != null
          ? v.total_final
          : (v.precio_unitario || 0) * (v.cantidad || 0),
    };
  });
  const totalFiscal =
    factura?.importe_total != null ? Number(factura.importe_total) : grupo.total;
  return {
    factura,
    esMock: factura?.estado === "mock",
    fecha: ejemplo?.fecha,
    created_at: ejemplo?.created_at,
    cliente: cliente?.nombre || "Consumidor final",
    total: totalFiscal,
    items,
    tipoLabel: "Factura C",
    punto_venta: factura?.punto_venta,
    numero: factura?.numero_comprobante,
    cae: factura?.cae,
    cae_vencimiento: factura?.cae_vencimiento,
  };
}
