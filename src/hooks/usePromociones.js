import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { normalizarPromociones } from "../lib/promociones";

function buildPromoPayload({
  nombre,
  tipo,
  llevar,
  pagar,
  porcentaje,
  monto_minimo,
  descuento_fijo,
  activa,
}) {
  const tipoFinal = tipo || "nxm";
  const payload = {
    nombre: nombre.trim(),
    tipo: tipoFinal,
    activa: activa !== false,
    llevar: tipoFinal === "nxm" ? Number(llevar) : null,
    pagar: tipoFinal === "nxm" ? Number(pagar) : null,
    porcentaje:
      tipoFinal === "porcentaje_productos" || tipoFinal === "porcentaje_monto_minimo"
        ? Number(porcentaje)
        : null,
    monto_minimo: tipoFinal === "porcentaje_monto_minimo" ? Number(monto_minimo) : null,
  };
  if (tipoFinal === "descuento_fijo_unidad") {
    payload.descuento_fijo = Number(descuento_fijo);
  }
  return payload;
}

/**
 * CRUD de promociones y vínculo con recetas.
 */
export function usePromociones({
  onRefresh,
  showToast,
  upsertPromocionInState,
  removePromocion,
} = {}) {
  const loadPromociones = useCallback(async () => {
    const { data, error } = await supabase
      .from("promociones")
      .select("*, promocion_recetas(receta_id)")
      .order("nombre");
    if (error) {
      console.error("[promociones/load]", error);
      throw error;
    }
    return normalizarPromociones(data);
  }, []);

  const savePromocion = useCallback(
    async (params) => {
      const { id, receta_ids } = params;
      const payload = buildPromoPayload(params);
      const pendingId = id || `pending-promo-${Date.now()}`;
      const optimisticPromo = { ...payload, id: pendingId, receta_ids: receta_ids || [] };

      showToast?.(id ? "Guardando cambios…" : "Creando promo…");
      upsertPromocionInState?.(optimisticPromo);

      try {
        let promoId = id;
        if (id) {
          const { error } = await supabase.from("promociones").update(payload).eq("id", id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("promociones")
            .insert(payload)
            .select("id")
            .single();
          if (error) throw error;
          promoId = data.id;
          if (pendingId !== promoId) removePromocion?.(pendingId);
        }
        const { error: delErr } = await supabase
          .from("promocion_recetas")
          .delete()
          .eq("promocion_id", promoId);
        if (delErr) throw delErr;
        const links = (receta_ids || []).map((receta_id) => ({
          promocion_id: promoId,
          receta_id,
        }));
        if (links.length > 0) {
          const { error: linkErr } = await supabase.from("promocion_recetas").insert(links);
          if (linkErr) throw linkErr;
        }
        upsertPromocionInState?.({ ...payload, id: promoId, receta_ids: receta_ids || [] });
        showToast?.(id ? "✅ Promo actualizada" : "✅ Promo creada");
      } catch (err) {
        if (!id) {
          removePromocion?.(pendingId);
        }
        await onRefresh?.();
        showToast?.("⚠️ Error al guardar promo");
        throw err;
      }
    },
    [onRefresh, showToast, upsertPromocionInState, removePromocion],
  );

  const toggleActiva = useCallback(
    async (promo) => {
      const nextActiva = !promo.activa;
      upsertPromocionInState?.({ ...promo, activa: nextActiva });
      const { error } = await supabase
        .from("promociones")
        .update({ activa: nextActiva })
        .eq("id", promo.id);
      if (error) {
        upsertPromocionInState?.({ ...promo, activa: promo.activa });
        await onRefresh?.();
        throw error;
      }
    },
    [onRefresh, upsertPromocionInState],
  );

  const deletePromocionFn = useCallback(
    async (promo) => {
      removePromocion?.(promo.id);
      showToast?.("Eliminando…");
      const { error } = await supabase.from("promociones").delete().eq("id", promo.id);
      if (error) {
        upsertPromocionInState?.(promo);
        await onRefresh?.();
        showToast?.("⚠️ Error al eliminar promo");
        throw error;
      }
      showToast?.("🗑️ Promo eliminada");
    },
    [onRefresh, showToast, removePromocion, upsertPromocionInState],
  );

  return { loadPromociones, savePromocion, toggleActiva, deletePromocion: deletePromocionFn };
}
