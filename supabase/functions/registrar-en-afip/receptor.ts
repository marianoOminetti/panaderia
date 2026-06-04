/** AFIP CondicionIVAReceptorId — ver enum CondicionIva en arca-facturacion */
export const CONDICION_IVA_CONSUMIDOR_FINAL = 5;
/** Receptor con CUIT: no usar CF (10242); default monotributista comprador */
export const CONDICION_IVA_RECEPTOR_CUIT = 6;

export type ReceptorFiscal = {
  cuit: string | null;
  razon_social: string;
  doc_tipo: number;
  doc_nro: number;
  condicion_iva: number;
};

export function normalizeCuitDigits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

export function resolveReceptorFiscal(input: {
  receptor_cuit?: string | null;
  receptor_razon_social?: string | null;
  cliente_nombre?: string | null;
}): ReceptorFiscal {
  const cuit = normalizeCuitDigits(input.receptor_cuit);
  const razonRaw = (input.receptor_razon_social ?? "").trim();
  const nombreCliente = (input.cliente_nombre ?? "").trim();

  if (cuit.length === 11) {
    return {
      cuit,
      razon_social: razonRaw || nombreCliente || "Consumidor Final",
      doc_tipo: 80,
      doc_nro: parseInt(cuit, 10),
      condicion_iva: CONDICION_IVA_RECEPTOR_CUIT,
    };
  }

  const razon = razonRaw || nombreCliente || "Consumidor Final";
  return {
    cuit: null,
    razon_social: razon,
    doc_tipo: 99,
    doc_nro: 0,
    condicion_iva: CONDICION_IVA_CONSUMIDOR_FINAL,
  };
}
