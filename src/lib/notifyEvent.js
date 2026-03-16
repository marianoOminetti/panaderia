/**
 * Dispara evento de notificación en el backend (Edge Function notify-event).
 * Tipos: venta, stock_zero, ingreso_mercaderia. Usado por Ventas/Stock tras acciones.
 */
import { supabase } from "./supabaseClient";

/**
 * Dispara un evento de notificación en el backend.
 * type: "venta" | "stock_zero" | "ingreso_mercaderia" (para Etapa 3).
 * payload: objeto según el tipo (ver Edge Function notify-event).
 */
export async function notifyEvent(type, payload) {
  try {
    await supabase.functions.invoke("notify-event", {
      body: { type, payload },
    });
  } catch (err) {
    // No romper el flujo de la app por un fallo de notificación
    console.error("[notifyEvent]", err);
  }
}

