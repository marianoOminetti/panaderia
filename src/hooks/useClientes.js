import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * CRUD de clientes y operaciones relacionadas (ventas, pedidos). Usado por Clientes.jsx y ClienteFormModal.
 * @param {{ onRefresh?: () => void, showToast?: (msg: string) => void }}
 * @returns {{ insertCliente, updateVentasClienteId, deleteCliente, ... }}
 */
export function useClientes({ onRefresh, showToast } = {}) {
  const insertCliente = useCallback(
    async ({ nombre, telefono }, options = {}) => {
      const { data, error } = await supabase
        .from("clientes")
        .insert({ nombre: nombre.trim(), telefono: telefono || null })
        .select("id")
        .single();
      if (error) {
        console.error("[clientes/insertCliente]", error);
        throw error;
      }
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
    if (error) {
      console.error("[clientes/updateVentasClienteId]", error);
      throw error;
    }
  }, []);

  /** Reasigna todos los pedidos de un cliente a otro (para fusión). Orden: llamar después de updateVentasClienteId y antes de deleteCliente. */
  const updatePedidosClienteId = useCallback(async (fromClienteId, toClienteId) => {
    const { error } = await supabase
      .from("pedidos")
      .update({ cliente_id: toClienteId })
      .eq("cliente_id", fromClienteId);
    if (error) {
      console.error("[clientes/updatePedidosClienteId]", error);
      throw error;
    }
  }, []);

  const deleteCliente = useCallback(async (id) => {
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) {
      console.error("[clientes/deleteCliente]", error);
      throw error;
    }
  }, []);

  /** Eliminación lógica: marca cliente como eliminado sin borrar ventas ni pedidos. */
  const softDeleteCliente = useCallback(
    async (id) => {
      const { error } = await supabase
        .from("clientes")
        .update({ eliminado: true })
        .eq("id", id);
      if (error) {
        console.error("[clientes/softDeleteCliente]", error);
        throw error;
      }
      showToast?.("Cliente dado de baja");
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  /** Borra ventas por ids (para rollback cuando falla updatePedidoEntregado tras insertVentas). */
  const deleteVentasByIds = useCallback(async (ids) => {
    if (!ids?.length) return;
    const { error } = await supabase.from("ventas").delete().in("id", ids);
    if (error) {
      console.error("[clientes/deleteVentasByIds]", error);
      throw error;
    }
  }, []);

  const insertPedidos = useCallback(
    async (rows, options = {}) => {
      const { error } = await supabase.from("pedidos").insert(rows);
      if (error) {
        console.error("[clientes/insertPedidos]", error);
        throw error;
      }
      if (!options.skipToast) showToast?.("✅ Pedido guardado");
      if (!options.skipRefresh) await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  const updatePedidoEstado = useCallback(
    async (pedido_id, estado) => {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado })
        .eq("pedido_id", pedido_id);
      if (error) {
        console.error("[clientes/updatePedidoEstado]", error);
        throw error;
      }
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
    if (error) {
      console.error("[clientes/insertVentas]", error);
      throw error;
    }
    return data || [];
  }, []);

  const updatePedidoEntregado = useCallback(
    async (pedido_id) => {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado: "entregado" })
        .eq("pedido_id", pedido_id);
      if (error) {
        console.error("[clientes/updatePedidoEntregado]", error);
        throw error;
      }
      showToast?.("✅ Pedido entregado registrado como venta");
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  const deletePedidosByPedidoId = useCallback(
    async (pedido_id) => {
      const { error } = await supabase
        .from("pedidos")
        .delete()
        .eq("pedido_id", pedido_id);
      if (error) {
        console.error("[clientes/deletePedidosByPedidoId]", error);
        throw error;
      }
      showToast?.("🗑️ Pedido cancelado");
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  return {
    insertCliente,
    updateVentasClienteId,
    updatePedidosClienteId,
    deleteCliente,
    softDeleteCliente,
    deleteVentasByIds,
    insertPedidos,
    updatePedidoEstado,
    insertVentas,
    updatePedidoEntregado,
    deletePedidosByPedidoId,
  };
}
