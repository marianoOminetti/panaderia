/**
 * Dispara evento de notificación en el backend (Edge Function notify-event).
 * Tipos: venta, stock_zero, ingreso_mercaderia. Usado por Ventas/Stock tras acciones.
 */
import * as Sentry from "@sentry/react";
import { supabase } from "./supabaseClient";

function reportPushDeliveryIssue(message, context) {
  console.warn("[notifyEvent]", message, context);
  if (process.env.REACT_APP_SENTRY_DSN && Sentry?.captureMessage) {
    Sentry.captureMessage(message, {
      level: "warning",
      tags: { area: "push" },
      extra: context,
    });
  }
}

/**
 * Dispara un evento de notificación en el backend.
 * type: "venta" | "venta_modificada" | "venta_eliminada" | "stock_zero" | "ingreso_mercaderia" | "test"
 * payload: objeto según el tipo (ver Edge Function notify-event).
 */
export async function notifyEvent(type, payload) {
  try {
    const { data, error } = await supabase.functions.invoke("notify-event", {
      body: { type, payload },
    });

    if (error) {
      reportPushDeliveryIssue("notify-event invoke failed", {
        type,
        message: error.message,
        payload,
      });
      return { ok: false, error };
    }

    if (data?.error) {
      reportPushDeliveryIssue("notify-event returned error", {
        type,
        backendError: data.error,
        status: data.status,
        payload,
      });
      return { ok: false, data };
    }

    const sent = data?.push?.sent;
    const total = data?.push?.total;
    const pushMessage = data?.push?.message;
    const noSubs =
      pushMessage === "No subscriptions" ||
      (typeof total === "number" && total === 0);
    if (typeof sent === "number" && sent === 0 && !noSubs) {
      reportPushDeliveryIssue("push not delivered (sent=0)", {
        type,
        total,
        pushMessage,
        payload,
      });
    }

    return { ok: true, data };
  } catch (err) {
    console.error("[notifyEvent]", err);
    reportPushDeliveryIssue("notify-event exception", {
      type,
      message: err?.message,
      payload,
    });
    return { ok: false, error: err };
  }
}
