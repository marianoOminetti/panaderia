/**
 * Sistema de logs de errores tipo Sentry.
 * - Si REACT_APP_SENTRY_DSN está configurado: envía a Sentry (init en index.js)
 * - Siempre: console.error + buffer en localStorage (últimos 50 errores)
 */

import * as Sentry from "@sentry/react";

const STORAGE_KEY = "panaderia_error_log";
const MAX_BUFFER = 50;

function getBuffer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBuffer(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-MAX_BUFFER)));
  } catch {}
}

/**
 * Reporta un error al sistema de logs.
 * @param {Error|string} error - El error o mensaje
 * @param {object} [context] - Contexto adicional (ej: { action: "eliminarVenta", ids: [...] })
 */
export function reportError(error, context = {}) {
  const msg = error?.message ?? String(error);
  const entry = {
    ts: new Date().toISOString(),
    message: msg,
    stack: error?.stack,
    ...context
  };

  // 1) Log local (console del navegador / dev tools)
  console.error("[Panadería Error]", entry);

  // 2) Buffer local para debugging rápido
  const buf = getBuffer();
  buf.push(entry);
  saveBuffer(buf);

  // 3) Enviar a Sentry si está configurado
  if (Sentry?.captureException) {
    Sentry.captureException(error instanceof Error ? error : new Error(msg), {
      extra: context
    });
  }

  // 4) Enviar a endpoint de Vercel para que quede en logs del servidor
  try {
    if (typeof window !== "undefined" && typeof fetch === "function") {
      const vercelPayload = {
        ...entry,
        url: window.location?.href || null,
        userAgent: window.navigator?.userAgent || null
      };
      fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vercelPayload)
      }).catch(() => {
        // Silencioso: no romper la UX si el log falla
      });
    }
  } catch {
    // No hacer nada si por alguna razón fallan los logs remotos
  }
}

/**
 * Obtiene los últimos errores del buffer (para debugging).
 */
export function getErrorLog() {
  return getBuffer();
}
