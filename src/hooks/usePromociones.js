import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { normalizarPromociones } from "../lib/promociones";

/**
 * CRUD de promociones y vínculo con recetas.
 */
export function usePromociones({ onRefresh, showToast } = {}) {
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
    async ({
      id,
      nombre,
      tipo,
      llevar,
      pagar,
      porcentaje,
      monto_minimo,
      activa,
      receta_ids,
    }) => {
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
        monto_minimo:
          tipoFinal === "porcentaje_monto_minimo" ? Number(monto_minimo) : null,
      };
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
      }
      await supabase.from("promocion_recetas").delete().eq("promocion_id", promoId);
      const links = (receta_ids || []).map((receta_id) => ({
        promocion_id: promoId,
        receta_id,
      }));
      if (links.length > 0) {
        const { error: linkErr } = await supabase.from("promocion_recetas").insert(links);
        if (linkErr) throw linkErr;
      }
      showToast?.(id ? "✅ Promo actualizada" : "✅ Promo creada");
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  const toggleActiva = useCallback(
    async (promo) => {
      const { error } = await supabase
        .from("promociones")
        .update({ activa: !promo.activa })
        .eq("id", promo.id);
      if (error) throw error;
      await onRefresh?.();
    },
    [onRefresh],
  );

  const deletePromocion = useCallback(
    async (promo) => {
      const { error } = await supabase.from("promociones").delete().eq("id", promo.id);
      if (error) throw error;
      showToast?.("🗑️ Promo eliminada");
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  return { loadPromociones, savePromocion, toggleActiva, deletePromocion };
}
