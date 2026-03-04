import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export function useClientes({ onRefresh, showToast } = {}) {
  const insertCliente = useCallback(
    async ({ nombre, telefono }, options = {}) => {
      const { data, error } = await supabase
        .from("clientes")
        .insert({ nombre: nombre.trim(), telefono: telefono || null })
        .select("id")
        .single();
      if (error) throw error;
      if (!options.skipToast) showToast?.("✅ Cliente agregado");
      if (!options.skipRefresh) await onRefresh?.();
      return data;
    },
    [onRefresh, showToast],
  );

  const updateVentasClienteId = useCallback(async (fromClienteId, toClienteId) => {
    const { error } = await supabase
      .from("ventas")
      .update({ cliente_id: toClienteId })
      .eq("cliente_id", fromClienteId);
    if (error) throw error;
  }, []);

  /** Reasigna todos los pedidos de un cliente a otro (para fusión). Orden: llamar después de updateVentasClienteId y antes de deleteCliente. */
  const updatePedidosClienteId = useCallback(async (fromClienteId, toClienteId) => {
    const { error } = await supabase
      .from("pedidos")
      .update({ cliente_id: toClienteId })
      .eq("cliente_id", fromClienteId);
    if (error) throw error;
  }, []);

  const deleteCliente = useCallback(async (id) => {
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) throw error;
  }, []);

  /** Borra ventas por ids (para rollback cuando falla updatePedidoEntregado tras insertVentas). */
  const deleteVentasByIds = useCallback(async (ids) => {
    if (!ids?.length) return;
    const { error } = await supabase.from("ventas").delete().in("id", ids);
    if (error) throw error;
  }, []);

  const insertPedidos = useCallback(
    async (rows) => {
      const { error } = await supabase.from("pedidos").insert(rows);
      if (error) throw error;
      showToast?.("✅ Pedido guardado");
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  const updatePedidoEstado = useCallback(
    async (pedido_id, estado) => {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado })
        .eq("pedido_id", pedido_id);
      if (error) throw error;
      await onRefresh?.();
    },
    [onRefresh],
  );

  /** Inserta ventas y devuelve los ids insertados (para rollback si falla un paso posterior). */
  const insertVentas = useCallback(async (rows) => {
    const { data, error } = await supabase
      .from("ventas")
      .insert(rows)
      .select("id");
    if (error) throw error;
    return data || [];
  }, []);

  const updatePedidoEntregado = useCallback(
    async (pedido_id) => {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado: "entregado" })
        .eq("pedido_id", pedido_id);
      if (error) throw error;
      showToast?.("✅ Pedido entregado registrado como venta");
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  return {
    insertCliente,
    updateVentasClienteId,
    updatePedidosClienteId,
    deleteCliente,
    deleteVentasByIds,
    insertPedidos,
    updatePedidoEstado,
    insertVentas,
    updatePedidoEntregado,
  };
}
