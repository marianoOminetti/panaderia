/** AFIP CondicionIVAReceptorId — ver enum CondicionIva en arca-facturacion */
export const CONDICION_IVA_CONSUMIDOR_FINAL = 5;
/** Receptor con CUIT: no usar CF (10242); default monotributista comprador */
export const CONDICION_IVA_RECEPTOR_CUIT = 6;

export const AFIP_DOC_CUIT = 80;
export const AFIP_DOC_DNI = 96;
export const AFIP_DOC_CONSUMIDOR_FINAL = 99;

export type ReceptorFiscal = {
  cuit: string | null;
  dni: string | null;
  razon_social: string;
  doc_tipo: number;
  doc_nro: number;
  condicion_iva: number;
};

export function normalizeCuitDigits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

function normalizeDocDigits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

/** Módulo 11 — mismo algoritmo que el front. */
function isValidCuit(cuit: string): boolean {
  if (cuit.length !== 11) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digits = cuit.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * mult[i];
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) check = 9;
  return check === digits[10];
}

function detectDocumento(digits: string): {
  doc_tipo: number;
  doc_nro: number;
  cuit: string | null;
  dni: string | null;
} | null {
  if (!digits) {
    return {
      doc_tipo: AFIP_DOC_CONSUMIDOR_FINAL,
      doc_nro: 0,
      cuit: null,
      dni: null,
    };
  }
  if (digits.length === 11) {
    if (!isValidCuit(digits)) return null;
    return {
      doc_tipo: AFIP_DOC_CUIT,
      doc_nro: parseInt(digits, 10),
      cuit: digits,
      dni: null,
    };
  }
  if (digits.length >= 7 && digits.length <= 8) {
    return {
      doc_tipo: AFIP_DOC_DNI,
      doc_nro: parseInt(digits, 10),
      cuit: null,
      dni: digits,
    };
  }
  return null;
}

export function resolveReceptorFiscal(input: {
  receptor_cuit?: string | null;
  receptor_dni?: string | null;
  receptor_doc_tipo?: number | null;
  receptor_doc_nro?: string | null;
  receptor_razon_social?: string | null;
  cliente_nombre?: string | null;
}): ReceptorFiscal {
  if (input.receptor_doc_tipo != null && input.receptor_doc_nro) {
    const tipo = Number(input.receptor_doc_tipo);
    const nro = normalizeDocDigits(input.receptor_doc_nro);
    const razonRaw = (input.receptor_razon_social ?? "").trim();
    const nombreCliente = (input.cliente_nombre ?? "").trim();
    const razon = razonRaw || nombreCliente || "Consumidor Final";
    if (tipo === AFIP_DOC_DNI && nro.length >= 7) {
      return {
        cuit: null,
        dni: nro,
        razon_social: razon,
        doc_tipo: AFIP_DOC_DNI,
        doc_nro: parseInt(nro, 10),
        condicion_iva: CONDICION_IVA_CONSUMIDOR_FINAL,
      };
    }
    if (tipo === AFIP_DOC_CUIT && nro.length === 11 && isValidCuit(nro)) {
      return {
        cuit: nro,
        dni: null,
        razon_social: razon,
        doc_tipo: AFIP_DOC_CUIT,
        doc_nro: parseInt(nro, 10),
        condicion_iva: CONDICION_IVA_RECEPTOR_CUIT,
      };
    }
  }

  const docInput = normalizeDocDigits(
    input.receptor_cuit || input.receptor_dni || input.receptor_doc_nro,
  );
  const detected = detectDocumento(docInput);
  const razonRaw = (input.receptor_razon_social ?? "").trim();
  const nombreCliente = (input.cliente_nombre ?? "").trim();
  const razon = razonRaw || nombreCliente || "Consumidor Final";

  if (!detected) {
    return {
      cuit: null,
      dni: null,
      razon_social: razon,
      doc_tipo: AFIP_DOC_CONSUMIDOR_FINAL,
      doc_nro: 0,
      condicion_iva: CONDICION_IVA_CONSUMIDOR_FINAL,
    };
  }

  if (detected.doc_tipo === AFIP_DOC_CUIT) {
    return {
      cuit: detected.cuit,
      dni: null,
      razon_social: razonRaw || nombreCliente || "Consumidor Final",
      doc_tipo: detected.doc_tipo,
      doc_nro: detected.doc_nro,
      condicion_iva: CONDICION_IVA_RECEPTOR_CUIT,
    };
  }

  if (detected.doc_tipo === AFIP_DOC_DNI) {
    return {
      cuit: null,
      dni: detected.dni,
      razon_social: razon,
      doc_tipo: detected.doc_tipo,
      doc_nro: detected.doc_nro,
      condicion_iva: CONDICION_IVA_CONSUMIDOR_FINAL,
    };
  }

  return {
    cuit: null,
    dni: null,
    razon_social: razon,
    doc_tipo: AFIP_DOC_CONSUMIDOR_FINAL,
    doc_nro: 0,
    condicion_iva: CONDICION_IVA_CONSUMIDOR_FINAL,
  };
}
