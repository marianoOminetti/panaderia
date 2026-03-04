import { useState, useEffect, useCallback, useRef } from "react";
import { fmt } from "../../lib/format";
import { getSemanaInicioISO } from "../../lib/dates";
import { calcularRequerimientoInsumosParaItems, getItemsExplotados } from "../../lib/stockPlan";
import { usePlanSemanal } from "../../hooks/usePlanSemanal";
import PlanSemanalTable from "./PlanSemanalTable";
import PlanSemanalActions from "./PlanSemanalActions";

function PlanSemanal({
  recetas,
  recetaIngredientes,
  insumos,
  insumoComposicion,
  insumoStock,
  actualizarStock,
  consumirInsumosPorStock,
  showToast,
  onRefresh,
  onPlanChanged,
}) {
  const {
    fetchPlan,
    insertPlanRow,
    updatePlanRow,
    deletePlanRow,
    upsertPlanRow,
  } = usePlanSemanal({ onRefresh, onPlanChanged, showToast });

  const [weekStart, setWeekStart] = useState(() => getSemanaInicioISO());
  const [planRows, setPlanRows] = useState([]);
  const [cartPlanItems, setCartPlanItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadingErrorShownRef = useRef(false);
  const weekStartRef = useRef(weekStart);

  useEffect(() => {
    weekStartRef.current = weekStart;
  }, [weekStart]);

  const cargarPlan = useCallback(
    async (semanaInicio) => {
      setLoading(true);
      const requested = semanaInicio;
      try {
        const data = await fetchPlan(semanaInicio);
        if (weekStartRef.current !== requested) return;
        setPlanRows(data || []);
        const items = (data || [])
          .filter((row) => (row.cantidad_planificada || 0) > 0)
          .map((row) => {
            const receta = recetas.find((r) => r.id === row.receta_id);
            return receta
              ? {
                  receta,
                  cantidad: Number(row.cantidad_planificada) || 0,
                }
              : null;
          })
          .filter(Boolean);
        setCartPlanItems(items);
      } catch {
        if (!loadingErrorShownRef.current) {
          showToast("⚠️ Error al cargar el plan semanal");
          loadingErrorShownRef.current = true;
        }
        if (weekStartRef.current === requested) {
          setPlanRows([]);
          setCartPlanItems([]);
        }
      } finally {
        if (weekStartRef.current === requested) setLoading(false);
      }
    },
    [fetchPlan, showToast, recetas],
  );

  useEffect(() => {
    cargarPlan(weekStart);
  }, [weekStart, cargarPlan]);

  const addToPlanCart = (receta, cantidad = 1) => {
    if (!receta) return;
    setCartPlanItems((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          cantidad: copy[idx].cantidad + cantidad,
        };
        return copy;
      }
      return [...prev, { receta, cantidad }];
    });
  };

  const updatePlanCartQuantity = (recetaId, delta) => {
    setCartPlanItems((prev) =>
      prev
        .map((item) =>
          item.receta.id === recetaId
            ? { ...item, cantidad: Math.max(0, item.cantidad + delta) }
            : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  };

  const removeFromPlanCart = (recetaId) => {
    setCartPlanItems((prev) =>
      prev.filter((item) => item.receta.id !== recetaId),
    );
  };

  const guardarPlan = async () => {
    setSaving(true);
    try {
      const existingByReceta = {};
      for (const pr of planRows || []) {
        if (pr.receta_id && pr.semana_inicio === weekStart) {
          existingByReceta[pr.receta_id] = pr;
        }
      }
      for (const { receta, cantidad } of cartPlanItems) {
        const existente = existingByReceta[receta.id];
        if (existente) {
          if (cantidad <= 0) {
            await deletePlanRow(existente.id);
          } else {
            await updatePlanRow(existente.id, { cantidad_planificada: cantidad });
          }
        } else if (cantidad > 0) {
          await insertPlanRow({
            semana_inicio: weekStart,
            receta_id: receta.id,
            cantidad_planificada: cantidad,
            cantidad_realizada: 0,
          });
        }
      }
      const cartRecetaIds = new Set(
        cartPlanItems.map((it) => it.receta.id),
      );
      for (const pr of planRows || []) {
        if (
          pr.semana_inicio === weekStart &&
          !cartRecetaIds.has(pr.receta_id)
        ) {
          await deletePlanRow(pr.id);
        }
      }
      showToast("✅ Plan semanal guardado");
      const data = await fetchPlan(weekStart);
      if (weekStartRef.current === weekStart && data) {
        setPlanRows(data);
        const items = data
          .filter((row) => (row.cantidad_planificada || 0) > 0)
          .map((row) => {
            const receta =
              recetas.find((r) => r.id === row.receta_id) || {
                id: row.receta_id,
                nombre: "Receta",
                emoji: "🍞",
                unidad_rinde: "u",
              };
            return {
              receta,
              cantidad: Number(row.cantidad_planificada) || 0,
            };
          });
        setCartPlanItems(items);
      }
      onPlanChanged?.();
    } catch {
      showToast("⚠️ Error al guardar el plan semanal");
    } finally {
      setSaving(false);
    }
  };

  const itemsPendientes = cartPlanItems
    .map(({ receta, cantidad: plan }) => {
      const existente = (planRows || []).find(
        (pr) =>
          pr.receta_id === receta.id &&
          pr.semana_inicio === weekStart,
      );
      const realizado = Number(existente?.cantidad_realizada || 0);
      const pendiente = Math.max(plan - realizado, 0);
      return pendiente > 0 ? { receta, cantidad: pendiente } : null;
    })
    .filter(Boolean);

  const requerimientos = calcularRequerimientoInsumosParaItems(
    itemsPendientes,
    recetaIngredientes,
    insumos,
    insumoComposicion,
    recetas,
  );

  const insumosCompra = (requerimientos || [])
    .map((req) => {
      const insumo = req.insumo;
      const stockActual = (insumoStock || {})[req.insumo_id] ?? 0;
      const faltante = Math.max(0, (req.cantidad || 0) - stockActual);
      let costo = 0;
      if (
        faltante > 0 &&
        insumo &&
        insumo.cantidad_presentacion > 0 &&
        insumo.precio != null
      ) {
        const precioUnitario =
          insumo.precio / insumo.cantidad_presentacion;
        costo = precioUnitario * faltante;
      }
      return { insumo_id: req.insumo_id, insumo, faltante, costo };
    })
    .filter((x) => x.faltante > 0);

  const totalCompra = insumosCompra.reduce(
    (s, x) => s + (x.costo || 0),
    0,
  );
  const totalPlanificadas = cartPlanItems.reduce(
    (s, it) => s + (it.cantidad || 0),
    0,
  );

  const semanaTitulo = () => {
    const inicio = new Date(weekStart);
    const fin = new Date(weekStart);
    fin.setDate(fin.getDate() + 6);
    return `${inicio.toLocaleDateString(
      "es-AR",
    )} al ${fin.toLocaleDateString("es-AR")}`;
  };

  const cambiarSemana = (delta) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };

  const buildWhatsAppText = () => {
    const inicio = new Date(weekStart);
    const fin = new Date(weekStart);
    fin.setDate(fin.getDate() + 6);
    let text = `Plan de producción semanal\n${inicio.toLocaleDateString(
      "es-AR",
    )} al ${fin.toLocaleDateString("es-AR")}`;
    if (totalPlanificadas > 0) {
      text += `\n\nEsta semana producís ${totalPlanificadas} unidades.`;
    }
    if (totalCompra > 0) {
      text += `\nNecesitás comprar aproximadamente ${fmt(
        totalCompra,
      )} en insumos.`;
    }
    if (insumosCompra.length > 0) {
      const porProveedor = {};
      for (const item of insumosCompra) {
        const proveedor = item.insumo?.proveedor || "Sin proveedor";
        if (!porProveedor[proveedor]) porProveedor[proveedor] = [];
        porProveedor[proveedor].push(item);
      }
      text += `\n\nLista de compras:`;
      Object.entries(porProveedor).forEach(([prov, items]) => {
        text += `\n\nProveedor: ${prov}`;
        items.forEach(({ insumo, faltante, costo }) => {
          const unidad = insumo?.unidad || "u";
          const costoTxt = costo > 0 ? ` (~${fmt(costo)})` : "";
          text += `\n- ${insumo?.nombre || "Insumo"}: ${faltante.toFixed(
            2,
          )} ${unidad}${costoTxt}`;
        });
      });
    }
    return text;
  };

  const handleProducir = async (item) => {
    const { receta, cantidad: plan } = item;
    const existente = (planRows || []).find(
      (pr) =>
        pr.receta_id === receta.id &&
        pr.semana_inicio === weekStart,
    );
    const realizado = Number(existente?.cantidad_realizada || 0);
    if (!plan || plan <= 0) {
      showToast("Agregá cantidad al plan primero.");
      return;
    }
    if (realizado >= plan) {
      showToast("Ya alcanzaste o superaste el plan para esta receta.");
      return;
    }
    const cantidad = plan - realizado;
    try {
      await actualizarStock(receta.id, cantidad);
      try {
        if (consumirInsumosPorStock) {
          const exploded = (recetas?.length && recetaIngredientes?.length)
            ? getItemsExplotados(receta.id, cantidad, recetaIngredientes, recetas)
            : [{ receta, cantidad }];
          for (const { receta: r, cantidad: c } of exploded) {
            if (r?.id && c > 0) await consumirInsumosPorStock(r.id, c);
          }
        }
        const nuevaRealizada = realizado + cantidad;
        await upsertPlanRow({
          semana_inicio: weekStart,
          receta_id: receta.id,
          cantidad_planificada: plan,
          cantidad_realizada: nuevaRealizada,
        });
      } catch (err) {
        try {
          await actualizarStock(receta.id, -cantidad);
        } catch (rollbackErr) {
          console.error("[handleProducir] rollback stock", rollbackErr);
        }
        throw err;
      }
      showToast(
        `✅ Producción registrada: +${cantidad} ${receta.nombre}`,
      );
      const data = await fetchPlan(weekStart);
      if (weekStartRef.current === weekStart && data) {
        setPlanRows(data);
      }
    } catch {
      showToast("⚠️ Error al registrar la producción");
    }
  };

  return (
    <div className="content">
      <p className="page-title">Plan semanal</p>
      <p className="page-subtitle">
        Definí qué vas a producir y generá la lista de compras.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Semana</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            style={{ width: "auto", padding: "6px 10px" }}
            onClick={() => cambiarSemana(-1)}
          >
            ← Anterior
          </button>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {semanaTitulo()}
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: "auto", padding: "6px 10px" }}
            onClick={() => cambiarSemana(1)}
          >
            Siguiente →
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Resumen</span>
        </div>
        <p style={{ fontSize: 13, marginBottom: 4 }}>
          Esta semana producís{" "}
          <strong>{totalPlanificadas}</strong> unidades.
        </p>
        <p style={{ fontSize: 13 }}>
          Necesitás comprar aproximadamente{" "}
          <strong>{fmt(totalCompra || 0)}</strong> en insumos.
        </p>
      </div>

      <PlanSemanalTable
        recetas={recetas}
        planRows={planRows}
        weekStart={weekStart}
        cartPlanItems={cartPlanItems}
        loading={loading}
        saving={saving}
        addToPlanCart={addToPlanCart}
        updatePlanCartQuantity={updatePlanCartQuantity}
        removeFromPlanCart={removeFromPlanCart}
        handleProducir={handleProducir}
        guardarPlan={guardarPlan}
      />

      <PlanSemanalActions
        insumosCompra={insumosCompra}
        waUrl={`https://wa.me/?text=${encodeURIComponent(
          buildWhatsAppText(),
        )}`}
      />
    </div>
  );
}

export default PlanSemanal;

