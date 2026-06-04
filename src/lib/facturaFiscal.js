import {
  formatCuitDisplay,
  isValidCuit,
  maskCuit,
  normalizeCuitInput,
} from "./cuit";
import { resolveEmisorComprobante } from "./afipEmisor";
import {
  AFIP_DOC_CONSUMIDOR_FINAL,
  AFIP_DOC_CUIT,
  AFIP_TIPO_FACTURA_C,
  buildAfipQrUrl,
  resolveEmisorCuit,
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
  const emisor = resolveEmisorComprobante(factura);
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
