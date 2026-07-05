import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { unificarVentasTransacciones } from "./useVentas";

function isRpcMissing(error) {
  if (!error) return false;
  const code = error.code || "";
  const msg = String(error.message || "");
  return (
    code === "42883" ||
    code === "PGRST202" ||
    code === "42P01" ||
    msg.includes("unificar_ventas_con_auditoria") ||
    msg.includes("deshacer_ventas_unificacion") ||
    msg.includes("ventas_unificaciones") ||
    msg.includes("Could not find the function") ||
    msg.includes("schema cache")
  );
}

function isRefreshSchemaError(error) {
  const msg = String(error?.message || "");
  return (
    /ventas_unificaciones|schema cache|relationship/i.test(msg) ||
    error?.code === "PGRST200"
  );
}

const SELECT_UNIFICACION = `
  id,
  cliente_id,
  transaccion_id_destino,
  marco_pagado,
  created_at,
  lineas:ventas_unificacion_lineas (
    venta_id,
    transaccion_id_origen,
    estado_pago_origen,
    medio_pago_origen
  )
`;

export function serializeLineasRpc(lineas) {
  return (lineas || []).map((l) => ({
    venta_id: l.venta_id,
    transaccion_id_origen: l.transaccion_id_origen ?? null,
    estado_pago_origen: l.estado_pago_origen || "pagado",
    medio_pago_origen: l.medio_pago_origen ?? null,
  }));
}

async function fetchVentasByIds(ventaIds) {
  const ids = (ventaIds || []).filter(Boolean);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("ventas").select("*").in("id", ids);
  if (error) {
    console.error("[useVentasUnificaciones/fetchVentasByIds]", error);
    throw error;
  }
  return data || [];
}

export function useVentasUnificaciones(clienteId) {
  const [unificacionesActivas, setUnificacionesActivas] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshUnificaciones = useCallback(async () => {
    if (!clienteId) {
      setUnificacionesActivas([]);
      return [];
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ventas_unificaciones")
        .select(SELECT_UNIFICACION)
        .eq("cliente_id", clienteId)
        .is("undone_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        if (isRefreshSchemaError(error)) {
          setUnificacionesActivas([]);
          return [];
        }
        console.error("[useVentasUnificaciones/refresh]", error);
        throw error;
      }
      const list = data || [];
      setUnificacionesActivas(list);
      return list;
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    void refreshUnificaciones();
  }, [refreshUnificaciones]);

  const unificarConAuditoria = useCallback(
    async ({
      clienteId: cid,
      transaccionIdDestino,
      marcarPagado,
      medioPago,
      lineas,
    }) => {
      const ventaIds = [...new Set((lineas || []).map((l) => l.venta_id).filter(Boolean))];
      const lineasRpc = serializeLineasRpc(lineas);

      const { data, error } = await supabase.rpc("unificar_ventas_con_auditoria", {
        p_cliente_id: cid,
        p_transaccion_destino: transaccionIdDestino,
        p_marco_pagado: Boolean(marcarPagado),
        p_medio_pago: medioPago || "efectivo",
        p_lineas: lineasRpc,
      });

      if (error) {
        if (isRpcMissing(error)) {
          const ventas = await unificarVentasTransacciones({
            ventaIds,
            transaccionIdDestino,
            marcarPagado,
            medioPago,
          });
          return {
            unificacionId: null,
            ventas,
            sinAuditoria: true,
          };
        }
        console.error("[useVentasUnificaciones/unificar]", error);
        throw error;
      }

      try {
        await refreshUnificaciones();
      } catch (refreshErr) {
        console.warn("[useVentasUnificaciones/unificar/refresh]", refreshErr);
      }

      const ventas = await fetchVentasByIds(ventaIds);
      return { unificacionId: data, ventas, sinAuditoria: false };
    },
    [refreshUnificaciones],
  );

  const deshacerUnificacion = useCallback(
    async (unificacionId) => {
      const { data, error } = await supabase.rpc("deshacer_ventas_unificacion", {
        p_unificacion_id: unificacionId,
      });

      if (error) {
        if (isRpcMissing(error)) {
          throw new Error(
            "Falta aplicar la migración de unificaciones en Supabase (ventas_unificaciones)",
          );
        }
        console.error("[useVentasUnificaciones/deshacer]", error);
        throw error;
      }

      try {
        await refreshUnificaciones();
      } catch (refreshErr) {
        console.warn("[useVentasUnificaciones/deshacer/refresh]", refreshErr);
      }
      return data || [];
    },
    [refreshUnificaciones],
  );

  return {
    unificacionesActivas,
    loadingUnificaciones: loading,
    refreshUnificaciones,
    unificarConAuditoria,
    deshacerUnificacion,
  };
}
