import { useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { isPendingPromoId, normalizarPromociones, uniqueRecetaIds } from "../lib/promociones";

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
  const saveInFlightRef = useRef(false);

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
      if (saveInFlightRef.current) return;
      const { id, receta_ids } = params;
      if (id && isPendingPromoId(id)) {
        showToast?.("Esperá a que termine de guardarse la promo");
        return;
      }

      saveInFlightRef.current = true;
      const payload = buildPromoPayload(params);
      const recetaIdsUnique = uniqueRecetaIds(receta_ids);
      const pendingId = id || `pending-promo-${Date.now()}`;
      const optimisticPromo = { ...payload, id: pendingId, receta_ids: recetaIdsUnique };

      showToast?.(id ? "Guardando cambios…" : "Creando promo…");
      upsertPromocionInState?.(optimisticPromo);

      let promoId = id;
      try {
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
          removePromocion?.(pendingId);
          upsertPromocionInState?.({
            ...payload,
            id: promoId,
            receta_ids: recetaIdsUnique,
          });
        }
        const { error: delErr } = await supabase
          .from("promocion_recetas")
          .delete()
          .eq("promocion_id", promoId);
        if (delErr) throw delErr;
        const links = recetaIdsUnique.map((receta_id) => ({
          promocion_id: promoId,
          receta_id,
        }));
        if (links.length > 0) {
          const { error: linkErr } = await supabase.from("promocion_recetas").insert(links);
          if (linkErr) throw linkErr;
        }
        upsertPromocionInState?.({
          ...payload,
          id: promoId,
          receta_ids: recetaIdsUnique,
        });
        showToast?.(id ? "✅ Promo actualizada" : "✅ Promo creada");
      } catch (err) {
        if (!id && promoId && !isPendingPromoId(promoId)) {
          upsertPromocionInState?.({
            ...payload,
            id: promoId,
            receta_ids: recetaIdsUnique,
          });
          err.partialPromoId = promoId;
        } else if (!id) {
          removePromocion?.(pendingId);
          await onRefresh?.();
        } else {
          await onRefresh?.();
        }
        showToast?.("⚠️ Error al guardar promo");
        throw err;
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [onRefresh, showToast, upsertPromocionInState, removePromocion],
  );

  const toggleActiva = useCallback(
    async (promo) => {
      if (isPendingPromoId(promo.id)) {
        showToast?.("Esperá a que termine de guardarse la promo");
        return;
      }
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
    [onRefresh, showToast, upsertPromocionInState],
  );

  const deletePromocionFn = useCallback(
    async (promo) => {
      if (isPendingPromoId(promo.id)) {
        removePromocion?.(promo.id);
        showToast?.("Promo pendiente descartada");
        return;
      }
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
