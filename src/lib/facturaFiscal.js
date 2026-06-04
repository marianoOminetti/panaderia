import {
  formatCuitDisplay,
  isValidCuit,
  maskCuit,
  normalizeCuitInput,
} from "./cuit";
import {
  AFIP_DOC_CONSUMIDOR_FINAL,
  AFIP_DOC_CUIT,
  AFIP_TIPO_FACTURA_C,
  buildAfipQrUrl,
  getAfipCuitEmisor,
} from "./afipQr";

function buildReceptorResult(razon, cuitRaw) {
  const cuitOk = cuitRaw.length === 11 && isValidCuit(cuitRaw);
  const razonTrim = (razon || "").trim();
  const esCf =
    !cuitOk &&
    (!razonTrim ||
      /^consumidor\s+final$/i.test(razonTrim));

  if (esCf) {
    return {
      razon_social: "Consumidor final",
      cuit: null,
      cuit_display: null,
      es_consumidor_final: true,
    };
  }

  return {
    razon_social: razonTrim || "Consumidor final",
    cuit: cuitOk ? cuitRaw : null,
    cuit_display: cuitOk ? formatCuitDisplay(cuitRaw) : null,
    es_consumidor_final: false,
  };
}

/** Factura emitida con snapshot guardado en facturas_electronicas. */
function facturaTieneSnapshotReceptor(factura) {
  if (!factura?.cae) return false;
  if (factura.receptor_cuit != null && factura.receptor_cuit !== "") {
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
export function resolveReceptorComprobante(factura, cliente) {
  if (facturaTieneSnapshotReceptor(factura)) {
    return buildReceptorResult(
      factura.receptor_razon_social,
      normalizeCuitInput(factura.receptor_cuit),
    );
  }

  return buildReceptorResult(
    (cliente?.razon_social || "").trim() ||
      (cliente?.nombre || "").trim() ||
      "",
    normalizeCuitInput(cliente?.cuit),
  );
}

/** Etiqueta corta (listas / WhatsApp) con CUIT enmascarado si aplica. */
export function formatClienteFiscalLabel(factura, clienteNombre, cliente) {
  const rec = resolveReceptorComprobante(
    factura,
    cliente ?? (clienteNombre ? { nombre: clienteNombre } : null),
  );
  if (rec.cuit) {
    return `${rec.razon_social} (CUIT ${maskCuit(rec.cuit)})`;
  }
  return rec.razon_social;
}

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
  const receptor = resolveReceptorComprobante(factura, cliente);
  const esMock = factura?.estado === "mock";
  const tipoDocRec = receptor.cuit
    ? AFIP_DOC_CUIT
    : AFIP_DOC_CONSUMIDOR_FINAL;
  const nroDocRec = receptor.cuit
    ? Number(receptor.cuit)
    : 0;
  const qrUrl =
    !esMock && factura?.cae
      ? buildAfipQrUrl({
          fecha: ejemplo?.fecha || ejemplo?.created_at,
          cuitEmisor: getAfipCuitEmisor(),
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
    receptorRazon: receptor.razon_social,
    receptorCuit: receptor.cuit_display,
    esConsumidorFinal: receptor.es_consumidor_final,
    total: totalFiscal,
    items,
    tipoLabel: "Factura C",
    punto_venta: factura?.punto_venta,
    numero: factura?.numero_comprobante,
    cae: factura?.cae,
    cae_vencimiento: factura?.cae_vencimiento,
    qrUrl,
  };
}
