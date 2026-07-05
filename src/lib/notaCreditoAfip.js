/**
 * Emite nota de crédito AFIP para una venta con factura autorizada.
 */
import { supabase } from "./supabaseClient";

export async function emitirNotaCreditoAfip(transaccionId) {
  if (!transaccionId) {
    return { ok: false, error: "Sin transaccion_id" };
  }
  try {
    const { data, error } = await supabase.functions.invoke("nota-credito-afip", {
      body: { transaccion_id: transaccionId },
    });
    if (error) {
      console.error("[notaCreditoAfip]", error);
      return { ok: false, error: error.message || "Error al invocar AFIP" };
    }
    return {
      ok: !!data?.ok,
      estado: data?.estado,
      cae: data?.cae,
      error: data?.error,
      mock: data?.mock,
      already_registered: data?.already_registered,
    };
  } catch (err) {
    console.error("[notaCreditoAfip]", err);
    return { ok: false, error: err?.message || "Error de red" };
  }
}
