import {
  formatCuitDisplay,
  isValidCuit,
  maskCuit,
  normalizeCuitInput,
} from "./cuit";
import {
  detectAfipDocumento,
  formatReceptorDocDisplay,
  formatReceptorDocLabel,
  maskDni,
} from "./afipDocumento";
import { resolveEmisorComprobante } from "./afipEmisor";
import {
  AFIP_DOC_CONSUMIDOR_FINAL,
  AFIP_DOC_CUIT,
  AFIP_DOC_DNI,
  AFIP_TIPO_FACTURA_C,
  AFIP_TIPO_NOTA_CREDITO_C,
  buildAfipQrUrl,
  resolveEmisorCuit,
} from "./afipQr";

function buildReceptorFromDetected(razon, detected) {
  const razonTrim = (razon || "").trim();
  if (detected.tipo === "cf") {
    const esCf =
      !razonTrim || /^consumidor\s+final$/i.test(razonTrim);
    return {
      razon_social: esCf ? "Consumidor final" : razonTrim,
      cuit: null,
      dni: null,
      doc_tipo: detected.doc_tipo,
      doc_nro: detected.doc_nro,
      cuit_display: null,
      dni_display: null,
      doc_etiqueta: null,
      es_consumidor_final: esCf,
    };
  }
  return {
    razon_social: razonTrim || "Consumidor final",
    cuit: detected.cuit,
    dni: detected.dni,
    doc_tipo: detected.doc_tipo,
    doc_nro: detected.doc_nro,
    cuit_display: detected.cuit ? formatCuitDisplay(detected.cuit) : null,
    dni_display: detected.dni || null,
    doc_etiqueta: detected.etiqueta,
    es_consumidor_final: false,
  };
}

function snapshotDocumentoInput(factura) {
  const tipo = factura?.receptor_doc_tipo != null
    ? Number(factura.receptor_doc_tipo)
    : null;
  if (tipo === AFIP_DOC_DNI && factura?.receptor_doc_nro) {
    return String(factura.receptor_doc_nro).replace(/\D/g, "");
  }
  if (factura?.receptor_cuit) {
    return normalizeCuitInput(factura.receptor_cuit);
  }
  if (tipo === AFIP_DOC_CUIT && factura?.receptor_doc_nro) {
    return normalizeCuitInput(factura.receptor_doc_nro);
  }
  return "";
}

/** Factura emitida con snapshot guardado en facturas_electronicas. */
function facturaTieneSnapshotReceptor(factura) {
  if (!factura?.cae) return false;
  if (factura.receptor_cuit != null && factura.receptor_cuit !== "") {
    return true;
  }
  if (factura.receptor_doc_nro != null && factura.receptor_doc_nro !== "") {
    return true;
  }
  const razon = (factura.receptor_razon_social ?? "").trim();
  return razon.length > 0;
}

/**
 * Datos del receptor para comprobante.
 * Si AFIP ya emitió con snapshot → solo snapshot (no mezclar CUIT nuevo de la ficha).
 * Sin snapshot → ficha cliente o nombre.
 */
function buildReceptorFromFacturaSnapshot(factura) {
  const tipo = factura?.receptor_doc_tipo != null
    ? Number(factura.receptor_doc_tipo)
    : null;
  const nroRaw = String(factura?.receptor_doc_nro ?? "").replace(/\D/g, "");
  const cuitRaw = normalizeCuitInput(factura?.receptor_cuit);
  if (tipo === AFIP_DOC_DNI && nroRaw.length >= 7) {
    return buildReceptorFromDetected(factura.receptor_razon_social, {
      ok: true,
      tipo: "dni",
      doc_tipo: AFIP_DOC_DNI,
      doc_nro: Number(nroRaw),
      cuit: null,
      dni: nroRaw,
      etiqueta: "DNI",
    });
  }
  if (
    (tipo === AFIP_DOC_CUIT || cuitRaw.length === 11) &&
    cuitRaw.length === 11 &&
    isValidCuit(cuitRaw)
  ) {
    return buildReceptorFromDetected(factura.receptor_razon_social, {
      ok: true,
      tipo: "cuit",
      doc_tipo: AFIP_DOC_CUIT,
      doc_nro: Number(cuitRaw),
      cuit: cuitRaw,
      dni: null,
      etiqueta: "CUIT",
    });
  }
  const detected = detectAfipDocumento(snapshotDocumentoInput(factura));
  if (detected.ok) {
    return buildReceptorFromDetected(factura.receptor_razon_social, detected);
  }
  return buildReceptorFromDetected(
    factura.receptor_razon_social,
    detectAfipDocumento(""),
  );
}

export function resolveReceptorComprobante(factura, cliente) {
  if (facturaTieneSnapshotReceptor(factura)) {
    return buildReceptorFromFacturaSnapshot(factura);
  }

  const docCliente = normalizeCuitInput(cliente?.cuit) ||
    String(cliente?.dni ?? "").replace(/\D/g, "").slice(0, 11);
  const detected = detectAfipDocumento(docCliente);
  if (!detected.ok) {
    return buildReceptorFromDetected(
      (cliente?.razon_social || "").trim() || (cliente?.nombre || "").trim() || "",
      detectAfipDocumento(""),
    );
  }
  return buildReceptorFromDetected(
    (cliente?.razon_social || "").trim() ||
      (cliente?.nombre || "").trim() ||
      "",
    detected,
  );
}

/** Etiqueta corta (listas / WhatsApp) con documento enmascarado si aplica. */
export function formatClienteFiscalLabel(factura, clienteNombre, cliente) {
  const rec = resolveReceptorComprobante(
    factura,
    cliente ?? (clienteNombre ? { nombre: clienteNombre } : null),
  );
  if (factura?.cae) {
    return formatReceptorDocLabel(rec.razon_social, factura);
  }
  if (rec.cuit) {
    return `${rec.razon_social} (CUIT ${maskCuit(rec.cuit)})`;
  }
  if (rec.dni) {
    return `${rec.razon_social} (DNI ${maskDni(rec.dni)})`;
  }
  return rec.razon_social;
}

/** transaccion_id del grupo de ventas, o null si es venta suelta sin agrupar */
/** Pto. vta. y número AFIP (00001-00000150). */
export function formatComprobanteNumero(punto_venta, numero) {
  if (punto_venta == null || numero == null) return null;
  const pv = String(punto_venta).padStart(5, "0");
  const nro = String(numero).padStart(8, "0");
  return `${pv}-${nro}`;
}

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

/** CAE guardado pero estado quedó en error (falló confirmación en DB). */
export function facturaNecesitaConfirmarAfip(factura) {
  return factura?.estado === "error" && !!factura?.cae;
}

export function facturaPuedeReintentarAfip(factura) {
  if (!factura) return true;
  if (factura.estado === "pendiente") return true;
  if (factura.estado === "error") return true;
  return false;
}

export function facturaPuedeEmitirNotaCredito(factura, notaCredito) {
  if (!factura?.cae) return false;
  if (!["autorizada", "mock"].includes(factura.estado)) return false;
  if (notaCredito?.estado === "autorizada" || notaCredito?.estado === "mock") {
    return false;
  }
  if (notaCredito?.estado === "pendiente") return false;
  return true;
}

export function notaCreditoListaParaPdf(notaCredito) {
  if (!notaCredito?.cae) return false;
  return (
    notaCredito.estado === "autorizada" ||
    notaCredito.estado === "mock" ||
    notaCredito.estado === "error"
  );
}

export function notaCreditoNecesitaConfirmar(notaCredito) {
  return notaCredito?.estado === "error" && !!notaCredito?.cae;
}

export function notaCreditoPuedeReintentar(notaCredito) {
  if (!notaCredito) return false;
  if (notaCredito.estado === "pendiente") return false;
  if (notaCredito.cae) return false;
  if (notaCredito.estado === "error") return true;
  return false;
}

export function formatFacturaAsociadaNumero(puntoVenta, numero) {
  return formatComprobanteNumero(puntoVenta, numero);
}

export function buildNotaCreditoFiscalData(
  grupo,
  factura,
  notaCredito,
  recetas,
  clientes,
  promociones = [],
) {
  const base = buildFacturaFiscalData(
    grupo,
    {
      ...factura,
      cae: notaCredito?.cae,
      cae_vencimiento: notaCredito?.cae_vencimiento,
      punto_venta: notaCredito?.punto_venta,
      numero_comprobante: notaCredito?.numero_comprobante,
      tipo_comprobante: notaCredito?.tipo_comprobante ?? AFIP_TIPO_NOTA_CREDITO_C,
      importe_total: notaCredito?.importe_total ?? factura?.importe_total,
      estado: notaCredito?.estado,
      emisor_cuit: notaCredito?.emisor_cuit ?? factura?.emisor_cuit,
    },
    recetas,
    clientes,
    promociones,
  );

  const ejemplo = grupo.rawItems?.[0] || grupo.items?.[0];
  const cliente = (clientes || []).find((c) => c.id === grupo.cliente_id);
  const receptor = resolveReceptorComprobante(factura, cliente);
  const tipoDocRec = receptor.doc_tipo ?? AFIP_DOC_CONSUMIDOR_FINAL;
  const nroDocRec = receptor.doc_nro ?? 0;
  const totalFiscal =
    notaCredito?.importe_total != null
      ? Number(notaCredito.importe_total)
      : base.total;
  const esMock = notaCredito?.estado === "mock";
  const qrUrl =
    !esMock && notaCredito?.cae
      ? buildAfipQrUrl({
          fecha: ejemplo?.fecha || ejemplo?.created_at,
          cuitEmisor: resolveEmisorCuit(notaCredito ?? factura),
          ptoVta: notaCredito?.punto_venta,
          tipoCmp: notaCredito?.tipo_comprobante ?? AFIP_TIPO_NOTA_CREDITO_C,
          nroCmp: notaCredito?.numero_comprobante,
          importe: totalFiscal,
          tipoDocRec,
          nroDocRec,
          cae: notaCredito.cae,
        })
      : null;

  return {
    ...base,
    factura,
    notaCredito,
    tipoLabel: "Nota de Crédito C",
    comprobanteNumero: formatComprobanteNumero(
      notaCredito?.punto_venta,
      notaCredito?.numero_comprobante,
    ),
    punto_venta: notaCredito?.punto_venta,
    numero: notaCredito?.numero_comprobante,
    cae: notaCredito?.cae,
    cae_vencimiento: notaCredito?.cae_vencimiento,
    esMock,
    qrUrl,
    facturaAsociadaNumero: formatFacturaAsociadaNumero(
      factura?.punto_venta ?? notaCredito?.factura_punto_venta,
      factura?.numero_comprobante ?? notaCredito?.factura_numero,
    ),
    modalTitle: "Nota de crédito AFIP",
  };
}

/** Ítems del comprobante a precio de lista (como ticket WhatsApp), no total_final repartido. */
export function buildGrupoLineasLista(grupo, recetas) {
  return (grupo.items || []).map((v) => {
    const r = (recetas || []).find((r2) => r2.id === v.receta_id);
    const cant = Number(v.cantidad) || 0;
    const precio = Number(v.precio_unitario) || 0;
    return {
      receta_id: v.receta_id,
      receta: r ? { nombre: r.nombre, emoji: r.emoji } : null,
      cantidad: v.cantidad,
      precio_unitario: precio,
      _lineTotal: precio * cant,
    };
  });
}

export function buildGrupoTotalesConPromo(grupo, items, promociones, totalCobrado) {
  const subtotal = (items || []).reduce(
    (s, it) => s + (Number(it._lineTotal) || 0),
    0,
  );
  const total =
    totalCobrado != null ? Number(totalCobrado) : Number(grupo.total) || 0;
  const descuento = Math.max(0, subtotal - total);
  const promoId = grupo.rawItems?.find((r) => r.promocion_id)?.promocion_id;
  const promo = (promociones || []).find((p) => p.id === promoId);
  return {
    subtotal,
    descuento,
    descuentoLabel: promo?.nombre
      ? `Promo: ${promo.nombre}`
      : descuento > 0
        ? "Descuento"
        : undefined,
    total,
  };
}

export function buildFacturaFiscalData(
  grupo,
  factura,
  recetas,
  clientes,
  promociones = [],
) {
  const ejemplo = grupo.rawItems?.[0] || grupo.items?.[0];
  const cliente = (clientes || []).find((c) => c.id === grupo.cliente_id);
  const items = buildGrupoLineasLista(grupo, recetas);
  const totalFiscal =
    factura?.importe_total != null ? Number(factura.importe_total) : grupo.total;
  const { subtotal, descuento, descuentoLabel, total } = buildGrupoTotalesConPromo(
    grupo,
    items,
    promociones,
    totalFiscal,
  );
  const receptor = resolveReceptorComprobante(factura, cliente);
  const docSnap = factura?.cae ? formatReceptorDocDisplay(factura) : null;
  const emisor = resolveEmisorComprobante(factura);
  const esMock = factura?.estado === "mock";
  const tipoDocRec = receptor.doc_tipo ?? AFIP_DOC_CONSUMIDOR_FINAL;
  const nroDocRec = receptor.doc_nro ?? 0;
  const qrUrl =
    !esMock && factura?.cae
      ? buildAfipQrUrl({
          fecha: ejemplo?.fecha || ejemplo?.created_at,
          cuitEmisor: resolveEmisorCuit(factura),
          ptoVta: factura?.punto_venta,
          tipoCmp: factura?.tipo_comprobante ?? AFIP_TIPO_FACTURA_C,
          nroCmp: factura?.numero_comprobante,
          importe: totalFiscal,
          tipoDocRec,
          nroDocRec,
          cae: factura.cae,
        })
      : null;

  return {
    factura,
    esMock,
    fecha: ejemplo?.fecha,
    created_at: ejemplo?.created_at,
    cliente: formatClienteFiscalLabel(factura, cliente?.nombre, cliente),
    emisorCuit: emisor.cuitDisplay,
    emisorDomicilio: emisor.domicilioComercial,
    emisorInicioActividades: emisor.inicioActividades,
    receptorRazon: receptor.razon_social,
    receptorCuit: receptor.cuit_display,
    receptorDni: receptor.dni_display,
    receptorDocEtiqueta:
      docSnap?.etiqueta || receptor.doc_etiqueta,
    receptorDocDisplay:
      docSnap?.display ||
      receptor.cuit_display ||
      receptor.dni_display,
    esConsumidorFinal: receptor.es_consumidor_final,
    subtotal,
    descuento,
    descuentoLabel,
    total,
    items,
    tipoLabel: "Factura C",
    comprobanteNumero: formatComprobanteNumero(
      factura?.punto_venta,
      factura?.numero_comprobante,
    ),
    punto_venta: factura?.punto_venta,
    numero: factura?.numero_comprobante,
    cae: factura?.cae,
    cae_vencimiento: factura?.cae_vencimiento,
    qrUrl,
  };
}
