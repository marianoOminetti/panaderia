/**
 * Solicita registro del comprobante en AFIP (Edge Function registrar-en-afip).
 */
import { supabase } from "./supabaseClient";

export async function registrarEnAfip(transaccionId, receptor = null) {
  if (!transaccionId) {
    return { ok: false, error: "Sin transaccion_id" };
  }
  try {
    const body = { transaccion_id: transaccionId };
    if (receptor) {
      body.receptor = {
        cuit: receptor.cuit ?? null,
        dni: receptor.dni ?? null,
        doc_tipo: receptor.doc_tipo ?? null,
        doc_nro: receptor.doc_nro ?? null,
        razon_social: receptor.razon_social ?? null,
      };
    }
    const { data, error } = await supabase.functions.invoke("registrar-en-afip", {
      body,
    });
    if (error) {
      console.error("[registrarEnAfip]", error);
      return { ok: false, error: error.message || "Error al invocar AFIP" };
    }
    return {
      ok: !!data?.ok,
      estado: data?.estado,
      cae: data?.cae,
      error: data?.error,
      mock: data?.mock,
    };
  } catch (err) {
    console.error("[registrarEnAfip]", err);
    return { ok: false, error: err?.message || "Error de red" };
  }
}
