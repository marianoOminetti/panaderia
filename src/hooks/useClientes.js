import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * CRUD de clientes y operaciones relacionadas (ventas, pedidos). Usado por Clientes.jsx y ClienteFormModal.
 * @param {{ onRefresh?: () => void, showToast?: (msg: string) => void, appendCliente?: (c: object) => void, updateClienteInState?: (c: object) => void }}
 * @returns {{ insertCliente, updateVentasClienteId, deleteCliente, ... }}
 */
export function useClientes({
  onRefresh,
  showToast,
  appendCliente,
  updateClienteInState,
  removeClienteFromState,
  appendPedidos,
  updatePedidosEstado,
  removePedidosByPedidoIdInState,
} = {}) {
  const updateClienteDatosFiscales = useCallback(
    async (id, { cuit, dni, razon_social }) => {
      const patch = { razon_social: (razon_social ?? "").trim() || null };
      if (cuit != null && String(cuit).replace(/\D/g, "").length > 0) {
        patch.cuit = String(cuit).replace(/\D/g, "").slice(0, 11);
      }
      if (dni != null && String(dni).replace(/\D/g, "").length > 0) {
        patch.dni = String(dni).replace(/\D/g, "").slice(0, 8);
      }
      const { error } = await supabase.from("clientes").update(patch).eq("id", id);
      if (error) {
        console.error("[clientes/updateClienteDatosFiscales]", error);
        const msg = error.message || "";
        if (/cuit|dni|razon_social|schema cache/i.test(msg)) {
          const err = new Error(
            "Faltan columnas fiscales en la base. Ejecutá scripts/aplicar_migracion_afip_receptor.sql en Supabase.",
          );
          err.cause = error;
          throw err;
        }
        throw error;
      }
      if (updateClienteInState) {
        updateClienteInState({ id, ...patch });
      } else {
        await onRefresh?.();
      }
    },
    [onRefresh, updateClienteInState],
  );

  const insertCliente = useCallback(
    async ({ nombre, telefono, cuit, dni, razon_social }, options = {}) => {
      const { data, error } = await supabase
        .from("clientes")
        .insert({
          nombre: nombre.trim(),
          telefono: telefono || null,
          cuit: cuit ? String(cuit).replace(/\D/g, "").slice(0, 11) : null,
          dni: dni ? String(dni).replace(/\D/g, "").slice(0, 8) : null,
          razon_social: (razon_social ?? "").trim() || null,
        })
        .select("*")
        .single();
      if (error) {
        console.error("[clientes/insertCliente]", error);
        throw error;
      }
      if (!options.skipToast) showToast?.("✅ Cliente agregado");
      if (appendCliente && data) {
        appendCliente(data);
      } else if (!options.skipRefresh) {
        await onRefresh?.();
      }
      return data;
    },
    [onRefresh, showToast, appendCliente],
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
      if (updateClienteInState) {
        updateClienteInState({ id, eliminado: true });
      } else {
        await onRefresh?.();
      }
    },
    [onRefresh, showToast, updateClienteInState],
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
      if (appendPedidos && rows?.length) {
        appendPedidos(rows);
      }
      const { error } = await supabase.from("pedidos").insert(rows);
      if (error) {
        console.error("[clientes/insertPedidos]", error);
        if (rows?.[0]?.pedido_id) {
          removePedidosByPedidoIdInState?.(rows[0].pedido_id);
        }
        throw error;
      }
      if (!options.skipToast) showToast?.("✅ Pedido guardado");
      if (!appendPedidos && !options.skipRefresh) await onRefresh?.();
    },
    [onRefresh, showToast, appendPedidos, removePedidosByPedidoIdInState],
  );

  const updatePedidoEstado = useCallback(
    async (pedido_id, estado) => {
      updatePedidosEstado?.(pedido_id, estado);
      const { error } = await supabase
        .from("pedidos")
        .update({ estado })
        .eq("pedido_id", pedido_id);
      if (error) {
        console.error("[clientes/updatePedidoEstado]", error);
        await onRefresh?.();
        throw error;
      }
      if (!updatePedidosEstado) await onRefresh?.();
    },
    [onRefresh, updatePedidosEstado],
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
      updatePedidosEstado?.(pedido_id, "entregado");
      const { error } = await supabase
        .from("pedidos")
        .update({ estado: "entregado" })
        .eq("pedido_id", pedido_id);
      if (error) {
        console.error("[clientes/updatePedidoEntregado]", error);
        await onRefresh?.();
        throw error;
      }
      showToast?.("✅ Pedido entregado registrado como venta");
      if (!updatePedidosEstado) await onRefresh?.();
    },
    [onRefresh, showToast, updatePedidosEstado],
  );

  const deletePedidosByPedidoId = useCallback(
    async (pedido_id) => {
      removePedidosByPedidoIdInState?.(pedido_id);
      showToast?.("Eliminando…");
      const { error } = await supabase
        .from("pedidos")
        .delete()
        .eq("pedido_id", pedido_id);
      if (error) {
        console.error("[clientes/deletePedidosByPedidoId]", error);
        await onRefresh?.();
        showToast?.("⚠️ Error al cancelar pedido");
        throw error;
      }
      showToast?.("🗑️ Pedido cancelado");
      if (!removePedidosByPedidoIdInState) await onRefresh?.();
    },
    [onRefresh, showToast, removePedidosByPedidoIdInState],
  );

  return {
    updateClienteDatosFiscales,
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
