/**
 * Administración de promociones: N×M, % en productos, % por monto mínimo.
 */
import { useState, useMemo, useRef } from "react";
import { reportError } from "../../utils/errorReport";
import { usePromociones } from "../../hooks/usePromociones";
import { TIPOS_PROMO, ALCANCE_PROMO, calcularPrecioListaCombo, etiquetaPromo, isPendingPromoId, promoEsExclusivaClientes, promoUsaProductos, promoUsaCantidadesPorProducto } from "../../lib/promociones";
import { FormInput, FormMoneyInput, FormCheckbox, SearchableSelect, QuantityControl } from "../ui";

const TIPOS_OPCIONES = [
  { value: TIPOS_PROMO.NXM, label: "Llevá N / Pagá M (ej. 5×4)" },
  { value: TIPOS_PROMO.PORCENTAJE_PRODUCTOS, label: "% descuento en productos" },
  { value: TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO, label: "% por monto mínimo de compra" },
  {
    value: TIPOS_PROMO.DESCUENTO_FIJO_UNIDAD,
    label: "Descuento fijo por unidad ($)",
  },
  {
    value: TIPOS_PROMO.COMBO_PRECIO_FIJO,
    label: "Combo a precio fijo",
  },
];

const emptyForm = () => ({
  nombre: "",
  tipo: TIPOS_PROMO.NXM,
  llevar: "5",
  pagar: "4",
  porcentaje: "20",
  monto_minimo: "50000",
  descuento_fijo: "1000",
  precio_combo: "",
  precio_combo_manual: false,
  combo_cantidades: {},
  activa: true,
  receta_ids: [],
  alcance: ALCANCE_PROMO.TODOS,
  cliente_ids: [],
});

export default function Promociones({ promociones, recetas, clientes = [], onRefresh, upsertPromocionInState, removePromocion, showToast, confirm }) {
  const { savePromocion, toggleActiva, deletePromocion } = usePromociones({
    onRefresh,
    showToast,
    upsertPromocionInState,
    removePromocion,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [searchRecetas, setSearchRecetas] = useState("");
  const [searchClientes, setSearchClientes] = useState("");
  const [saving, setSaving] = useState(false);
  const saveInFlightRef = useRef(false);

  const usaProductos = promoUsaProductos(form.tipo);
  const usaCantidades = promoUsaCantidadesPorProducto(form.tipo);
  const promoBloqueada = (p) => isPendingPromoId(p?.id) || saving;

  const recalcPrecioCombo = (prev) => {
    if (prev.tipo !== TIPOS_PROMO.COMBO_PRECIO_FIJO || prev.precio_combo_manual) return prev;
    const total = calcularPrecioListaCombo(recetas, prev.receta_ids, prev.combo_cantidades);
    return { ...prev, precio_combo: total > 0 ? String(total) : "" };
  };

  const precioListaCombo = useMemo(
    () => calcularPrecioListaCombo(recetas, form.receta_ids, form.combo_cantidades),
    [recetas, form.receta_ids, form.combo_cantidades],
  );

  const abrirNueva = () => {
    setEditId(null);
    setForm(emptyForm());
    setSearchRecetas("");
    setSearchClientes("");
    setModalOpen(true);
  };

  const abrirEditar = (p) => {
    if (isPendingPromoId(p.id)) {
      showToast("Esperá a que termine de guardarse la promo");
      return;
    }
    setEditId(p.id);
    const comboCantidades = {};
    for (const item of p.combo_items || []) {
      if (item.receta_id) comboCantidades[item.receta_id] = String(item.cantidad ?? 1);
    }
    const recetaIds = [...(p.receta_ids || [])];
    const precioListaEdit = calcularPrecioListaCombo(recetas, recetaIds, comboCantidades);
    const precioGuardado = p.precio_combo != null ? Number(p.precio_combo) : null;
    setForm({
      nombre: p.nombre || "",
      tipo: p.tipo || TIPOS_PROMO.NXM,
      llevar: String(p.llevar ?? 5),
      pagar: String(p.pagar ?? 4),
      porcentaje: String(p.porcentaje ?? 20),
      monto_minimo: String(p.monto_minimo ?? 50000),
      descuento_fijo: String(p.descuento_fijo ?? 1000),
      precio_combo: p.precio_combo != null ? String(p.precio_combo) : "",
      precio_combo_manual:
        p.tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO &&
        precioGuardado != null &&
        precioGuardado !== precioListaEdit,
      combo_cantidades: comboCantidades,
      activa: p.activa !== false,
      receta_ids: [...(p.receta_ids || [])],
      alcance: p.alcance === ALCANCE_PROMO.CLIENTES ? ALCANCE_PROMO.CLIENTES : ALCANCE_PROMO.TODOS,
      cliente_ids: [...(p.cliente_ids || [])],
    });
    setSearchRecetas("");
    setSearchClientes("");
    setModalOpen(true);
  };

  const recetasFiltradas = useMemo(() => {
    const q = searchRecetas.trim().toLowerCase();
    return [...(recetas || [])]
      .filter((r) => !q || (r.nombre || "").toLowerCase().includes(q))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
  }, [recetas, searchRecetas]);

  const usaClientes = form.alcance === ALCANCE_PROMO.CLIENTES;

  const clientesFiltrados = useMemo(() => {
    const q = searchClientes.trim().toLowerCase();
    return [...(clientes || [])]
      .filter((c) => c.eliminado !== true)
      .filter((c) => !q || (c.nombre || "").toLowerCase().includes(q))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
  }, [clientes, searchClientes]);

  const clientesSeleccionadosNombres = useMemo(() => {
    const byId = new Map((clientes || []).map((c) => [c.id, c.nombre]));
    return (form.cliente_ids || [])
      .map((id) => byId.get(id))
      .filter(Boolean);
  }, [clientes, form.cliente_ids]);

  const toggleCliente = (clienteId) => {
    setForm((prev) => {
      const ids = prev.cliente_ids || [];
      return ids.includes(clienteId)
        ? { ...prev, cliente_ids: ids.filter((id) => id !== clienteId) }
        : { ...prev, cliente_ids: [...ids, clienteId] };
    });
  };

  const productosDePromo = (p) => {
    if (p.tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO && p.combo_items?.length) {
      return p.combo_items
        .map((item) => {
          const receta = recetas.find((r) => r.id === item.receta_id);
          return receta ? { ...receta, comboCantidad: item.cantidad } : null;
        })
        .filter(Boolean);
    }
    return (p.receta_ids || [])
      .map((rid) => recetas.find((r) => r.id === rid))
      .filter(Boolean);
  };

  const seleccionarTodosVisibles = () => {
    const idsVisibles = recetasFiltradas.map((r) => r.id);
    setForm((prev) => {
      const nextCantidades = { ...(prev.combo_cantidades || {}) };
      for (const id of idsVisibles) {
        if (!nextCantidades[id]) nextCantidades[id] = "1";
      }
      return recalcPrecioCombo({
        ...prev,
        receta_ids: [...new Set([...(prev.receta_ids || []), ...idsVisibles])],
        combo_cantidades: nextCantidades,
      });
    });
  };

  const limpiarSeleccionProductos = () => {
    setForm((prev) =>
      recalcPrecioCombo({
        ...prev,
        receta_ids: [],
        combo_cantidades: {},
        precio_combo: prev.tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO ? "" : prev.precio_combo,
      }),
    );
  };

  const toggleReceta = (recetaId) => {
    setForm((prev) => {
      const ids = prev.receta_ids || [];
      if (ids.includes(recetaId)) {
        const nextCantidades = { ...(prev.combo_cantidades || {}) };
        delete nextCantidades[recetaId];
        return recalcPrecioCombo({
          ...prev,
          receta_ids: ids.filter((id) => id !== recetaId),
          combo_cantidades: nextCantidades,
        });
      }
      return recalcPrecioCombo({
        ...prev,
        receta_ids: [...ids, recetaId],
        combo_cantidades: {
          ...(prev.combo_cantidades || {}),
          [recetaId]: prev.combo_cantidades?.[recetaId] || "1",
        },
      });
    });
  };

  const setComboCantidad = (recetaId, value) => {
    setForm((prev) =>
      recalcPrecioCombo({
        ...prev,
        combo_cantidades: { ...(prev.combo_cantidades || {}), [recetaId]: value },
      }),
    );
  };

  const guardar = async () => {
    if (saveInFlightRef.current || saving) return;
    const nombre = form.nombre.trim();
    if (!nombre) {
      showToast("Ingresá un nombre para la promo");
      return;
    }

    const tipo = form.tipo || TIPOS_PROMO.NXM;
    let llevar;
    let pagar;
    let porcentaje;
    let monto_minimo;
    let descuento_fijo;
    let precio_combo;
    let combo_items;

    if (tipo === TIPOS_PROMO.NXM) {
      llevar = parseInt(form.llevar, 10);
      pagar = parseInt(form.pagar, 10);
      if (!Number.isFinite(llevar) || !Number.isFinite(pagar) || pagar >= llevar || pagar < 1) {
        showToast("Revisá llevá / pagá (pagá debe ser menor que llevá)");
        return;
      }
      if (!form.receta_ids?.length) {
        showToast("Elegí al menos un producto");
        return;
      }
    } else if (tipo === TIPOS_PROMO.PORCENTAJE_PRODUCTOS) {
      porcentaje = parseFloat(String(form.porcentaje).replace(",", "."));
      if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
        showToast("El porcentaje debe ser entre 1 y 100");
        return;
      }
      if (!form.receta_ids?.length) {
        showToast("Elegí al menos un producto");
        return;
      }
    } else if (tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO) {
      porcentaje = parseFloat(String(form.porcentaje).replace(",", "."));
      monto_minimo = parseFloat(String(form.monto_minimo).replace(",", "."));
      if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
        showToast("El porcentaje debe ser entre 1 y 100");
        return;
      }
      if (!Number.isFinite(monto_minimo) || monto_minimo <= 0) {
        showToast("Ingresá un monto mínimo mayor a 0");
        return;
      }
    } else if (tipo === TIPOS_PROMO.DESCUENTO_FIJO_UNIDAD) {
      descuento_fijo = parseFloat(String(form.descuento_fijo).replace(",", "."));
      if (!Number.isFinite(descuento_fijo) || descuento_fijo <= 0) {
        showToast("Ingresá un descuento por unidad mayor a 0");
        return;
      }
      if (!form.receta_ids?.length) {
        showToast("Elegí al menos un producto");
        return;
      }
    } else if (tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO) {
      precio_combo = parseFloat(String(form.precio_combo).replace(",", "."));
      if (!Number.isFinite(precio_combo) || precio_combo < 0) {
        showToast("Ingresá un precio de combo válido");
        return;
      }
      if (!form.receta_ids?.length || form.receta_ids.length < 2) {
        showToast("Un combo necesita al menos 2 productos");
        return;
      }
      combo_items = [];
      for (const receta_id of form.receta_ids) {
        const raw = String(form.combo_cantidades?.[receta_id] ?? "1").trim().replace(",", ".");
        const cant = parseFloat(raw);
        if (!Number.isFinite(cant) || cant < 0.1) {
          const receta = recetas.find((r) => r.id === receta_id);
          showToast(`Cantidad inválida para ${receta?.nombre || "un producto"}`);
          return;
        }
        combo_items.push({ receta_id, cantidad: cant });
      }
    }

    if (usaClientes && !(form.cliente_ids || []).length) {
      showToast("Elegí al menos un cliente para la promo exclusiva");
      return;
    }

    saveInFlightRef.current = true;
    setSaving(true);
    setModalOpen(false);
    try {
      await savePromocion({
        id: editId,
        nombre,
        tipo,
        llevar,
        pagar,
        porcentaje,
        monto_minimo,
        descuento_fijo,
        precio_combo,
        activa: form.activa,
        receta_ids: usaProductos ? form.receta_ids : [],
        combo_items,
        alcance: form.alcance,
        cliente_ids: usaClientes ? form.cliente_ids : [],
      });
    } catch (err) {
      if (err?.partialPromoId) setEditId(err.partialPromoId);
      reportError(err, { action: "savePromocion", id: editId || err?.partialPromoId });
      const msg = String(err?.message || "");
      const faltaColumna = /descuento_fijo|precio_combo|cantidad/i.test(msg);
      showToast(
        faltaColumna
          ? "⚠️ Falta migración en Supabase (combo). Ver scripts/aplicar_migracion_promociones_combo.sql"
          : msg
            ? `⚠️ ${msg.slice(0, 120)}`
            : "⚠️ Error al guardar promo",
      );
      setModalOpen(true);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  const toggleConValidacion = async (p) => {
    if (promoBloqueada(p)) return;
    try {
      await toggleActiva(p);
    } catch (err) {
      reportError(err, { action: "toggleActiva", id: p.id });
      showToast("⚠️ Error al cambiar estado");
    }
  };

  const eliminar = async (p) => {
    if (promoBloqueada(p) && !isPendingPromoId(p.id)) return;
    const ok = await confirm?.(`¿Eliminar la promo "${p.nombre}"?`, { destructive: true });
    if (!ok) return;
    try {
      await deletePromocion(p);
    } catch (err) {
      reportError(err, { action: "deletePromocion", id: p.id });
      showToast("⚠️ Error al eliminar");
    }
  };

  const lista = [...(promociones || [])].sort((a, b) =>
    (a.nombre || "").localeCompare(b.nombre || "", "es"),
  );

  return (
    <div className="content">
      <p className="page-title">Promociones</p>
      <p className="page-subtitle">
        Reglas automáticas al cobrar: 5×4, % en productos, monto mínimo, $ fijo por unidad o combos
      </p>

      <button type="button" className="btn-primary" style={{ marginBottom: 16 }} onClick={abrirNueva}>
        + Nueva promo
      </button>

      {lista.length === 0 ? (
        <div className="card">
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            No hay promos configuradas. Creá una y definí cómo se aplica el descuento.
          </p>
        </div>
      ) : (
        lista.map((p) => (
          <div key={p.id} className="card" style={{ marginBottom: 12 }}>
            <div className="card-header">
              <span className="card-title">{p.nombre}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 8,
                  background:
                    p.activa !== false ? "rgba(74, 124, 89, 0.15)" : "var(--border)",
                  color: p.activa !== false ? "var(--green)" : "var(--text-muted)",
                  fontWeight: p.activa !== false ? 600 : 400,
                }}
              >
                {p.activa !== false ? "Activa" : "Inactiva"}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
              {etiquetaPromo(p)}
            </p>
            {promoEsExclusivaClientes(p) && (
              <p style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, marginBottom: 8 }}>
                🔒 Exclusiva · {(p.cliente_ids || []).length} cliente
                {(p.cliente_ids || []).length === 1 ? "" : "s"}
              </p>
            )}
            {promoUsaProductos(p.tipo) && (p.receta_ids || []).length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                {productosDePromo(p).map((r) => (
                  <span
                    key={r.id}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      borderRadius: 8,
                      background: "rgba(74, 124, 89, 0.12)",
                      color: "var(--green)",
                    }}
                  >
                    {r.emoji || "🍞"} {r.nombre}
                    {r.comboCantidad != null ? ` × ${r.comboCantidad}` : ""}
                  </span>
                ))}
              </div>
            )}
            {promoUsaProductos(p.tipo) && (p.receta_ids || []).length === 0 && (
              <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8 }}>
                Sin productos asignados
              </p>
            )}
            {isPendingPromoId(p.id) && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                Guardando en la nube…
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 0 }}
                disabled={promoBloqueada(p)}
                onClick={() => abrirEditar(p)}
              >
                Editar
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  className={p.activa !== false ? "btn-danger" : "btn-secondary"}
                  style={{ marginTop: 0 }}
                  disabled={promoBloqueada(p)}
                  onClick={() => toggleConValidacion(p)}
                >
                  {p.activa !== false ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  style={{ marginTop: 0 }}
                  disabled={saving && !isPendingPromoId(p.id)}
                  onClick={() => eliminar(p)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {modalOpen && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button type="button" className="screen-back" onClick={() => setModalOpen(false)}>
              ← Volver
            </button>
            <span className="screen-title">{editId ? "Editar promo" : "Nueva promo"}</span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <FormInput
                label="Nombre"
                value={form.nombre}
                onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}
                placeholder="Ej: 20% en medialunas"
              />
              <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                Tipo de promo
              </label>
              <SearchableSelect
                options={TIPOS_OPCIONES}
                value={form.tipo}
                onChange={(v) =>
                  setForm((prev) => {
                    const tipo = v || TIPOS_PROMO.NXM;
                    const comboCantidades = { ...(prev.combo_cantidades || {}) };
                    if (tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO) {
                      for (const recetaId of prev.receta_ids || []) {
                        if (!comboCantidades[recetaId]) comboCantidades[recetaId] = "1";
                      }
                    }
                    const next = {
                      ...prev,
                      tipo,
                      combo_cantidades: comboCantidades,
                      precio_combo_manual:
                        tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO ? prev.precio_combo_manual : false,
                    };
                    if (tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO && !next.precio_combo_manual) {
                      const total = calcularPrecioListaCombo(
                        recetas,
                        next.receta_ids,
                        next.combo_cantidades,
                      );
                      next.precio_combo = total > 0 ? String(total) : "";
                    }
                    return next;
                  })
                }
                placeholder="Elegí el tipo"
                emptyMessage="Sin tipos"
                style={{ marginBottom: 12 }}
              />

              {form.tipo === TIPOS_PROMO.NXM && (
                <div style={{ display: "flex", gap: 12 }}>
                  <FormInput
                    label="Llevá"
                    value={form.llevar}
                    onChange={(v) => setForm((f) => ({ ...f, llevar: v }))}
                    inputMode="numeric"
                  />
                  <FormInput
                    label="Pagá"
                    value={form.pagar}
                    onChange={(v) => setForm((f) => ({ ...f, pagar: v }))}
                    inputMode="numeric"
                  />
                </div>
              )}

              {(form.tipo === TIPOS_PROMO.PORCENTAJE_PRODUCTOS ||
                form.tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO) && (
                <FormInput
                  label="Porcentaje de descuento"
                  value={form.porcentaje}
                  onChange={(v) => setForm((f) => ({ ...f, porcentaje: v }))}
                  inputMode="decimal"
                  placeholder="Ej: 20"
                />
              )}

              {form.tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO && (
                <FormMoneyInput
                  label="Monto mínimo de compra"
                  value={form.monto_minimo}
                  onChange={(v) => setForm((f) => ({ ...f, monto_minimo: v }))}
                  placeholder="50000"
                />
              )}

              {form.tipo === TIPOS_PROMO.DESCUENTO_FIJO_UNIDAD && (
                <>
                  <FormMoneyInput
                    label="Descuento por unidad"
                    value={form.descuento_fijo}
                    onChange={(v) => setForm((f) => ({ ...f, descuento_fijo: v }))}
                    placeholder="1000"
                  />
                  <p className="form-hint" style={{ marginTop: -8, marginBottom: 12 }}>
                    Ej: tarta a $8.500 con $1.000 off → cobrás $7.500 por unidad.
                  </p>
                </>
              )}

              <FormCheckbox
                label="Promo activa"
                checked={form.activa}
                onChange={(v) => setForm((f) => ({ ...f, activa: v }))}
              />

              <label className="form-label" style={{ display: "block", margin: "12px 0 6px" }}>
                ¿Para quién es la promo?
              </label>
              <SearchableSelect
                options={[
                  { value: ALCANCE_PROMO.TODOS, label: "Todos los clientes" },
                  { value: ALCANCE_PROMO.CLIENTES, label: "Solo ciertos clientes" },
                ]}
                value={form.alcance}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    alcance:
                      v === ALCANCE_PROMO.CLIENTES
                        ? ALCANCE_PROMO.CLIENTES
                        : ALCANCE_PROMO.TODOS,
                  }))
                }
                placeholder="Elegí el alcance"
                emptyMessage="Sin opciones"
              />
              <p className="form-hint" style={{ marginTop: 6, marginBottom: 0 }}>
                {usaClientes
                  ? "Exclusiva: solo se aplica a los clientes elegidos y no aparece en ventas sin cliente."
                  : "Se aplica automáticamente en cualquier venta que cumpla la condición."}
              </p>
            </div>

            {usaClientes && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <span className="card-title">Clientes con la promo</span>
                  <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                    {(form.cliente_ids || []).length} seleccionado
                    {(form.cliente_ids || []).length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="form-hint" style={{ marginBottom: 8 }}>
                  La promo solo aplica cuando la venta tiene alguno de estos clientes. El
                  cliente se elige en el cobro.
                </p>
                {clientesSeleccionadosNombres.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {clientesSeleccionadosNombres.map((nombre, i) => (
                      <span
                        key={`${nombre}-${i}`}
                        style={{
                          fontSize: 12,
                          padding: "4px 8px",
                          borderRadius: 8,
                          background: "rgba(74, 124, 89, 0.12)",
                          color: "var(--green)",
                        }}
                      >
                        {nombre}
                      </span>
                    ))}
                  </div>
                )}
                <FormInput
                  label="Buscar cliente"
                  value={searchClientes}
                  onChange={setSearchClientes}
                  placeholder="Nombre del cliente"
                />
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {clientesFiltrados.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>
                      No hay clientes que coincidan.
                    </p>
                  ) : (
                    clientesFiltrados.map((c) => {
                      const checked = (form.cliente_ids || []).includes(c.id);
                      return (
                        <label
                          key={c.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            marginBottom: 4,
                            borderRadius: 8,
                            border: checked
                              ? "1px solid rgba(74, 124, 89, 0.4)"
                              : "1px solid var(--border)",
                            background: checked ? "rgba(74, 124, 89, 0.08)" : "transparent",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCliente(c.id)}
                          />
                          <span style={{ flex: 1 }}>{c.nombre}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {usaProductos && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <span className="card-title">Productos incluidos</span>
                  <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                    {form.receta_ids.length} seleccionado
                    {form.receta_ids.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="form-hint" style={{ marginBottom: 8 }}>
                  {usaCantidades
                    ? "Elegí los productos del combo y la cantidad de cada uno (ej. 4 unidades de chipa 100g = 400g, o 0,4 si el producto se vende por kg)."
                    : "Marcá todos los productos que entran en esta promo. Un mismo producto puede estar en varias promos activas."}
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "auto", marginTop: 0, padding: "6px 12px", fontSize: 12 }}
                    onClick={seleccionarTodosVisibles}
                  >
                    Marcar visibles
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "auto", marginTop: 0, padding: "6px 12px", fontSize: 12 }}
                    onClick={limpiarSeleccionProductos}
                  >
                    Quitar todos
                  </button>
                </div>
                <FormInput
                  label="Buscar"
                  value={searchRecetas}
                  onChange={setSearchRecetas}
                  placeholder="Nombre del producto"
                />
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {recetasFiltradas.map((r) => {
                    const checked = form.receta_ids.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          marginBottom: 4,
                          borderRadius: 8,
                          border: checked
                            ? "1px solid rgba(74, 124, 89, 0.4)"
                            : "1px solid var(--border)",
                          background: checked ? "rgba(74, 124, 89, 0.08)" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleReceta(r.id)}
                        />
                        <span style={{ flex: 1 }}>
                          {r.emoji || "🍞"} {r.nombre}
                        </span>
                        {usaCantidades && checked && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <QuantityControl
                              value={form.combo_cantidades?.[r.id] ?? "1"}
                              onChange={(v) => setComboCantidad(r.id, String(v))}
                              onChangeRaw={(v) => setComboCantidad(r.id, v)}
                              min={0.1}
                              step="auto"
                              size="sm"
                              allowDecimals
                            />
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {form.tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO && (
              <div className="card" style={{ marginBottom: 16 }}>
                <FormMoneyInput
                  label="Precio del combo"
                  value={form.precio_combo}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, precio_combo: v, precio_combo_manual: true }))
                  }
                  placeholder={precioListaCombo > 0 ? String(precioListaCombo) : "0"}
                />
                <p className="form-hint" style={{ marginTop: -8, marginBottom: 8 }}>
                  Se completa con la suma de los productos. Bajalo si querés aplicar descuento (ej.
                  lista $24.500 → combo $22.000).
                </p>
                {form.precio_combo_manual && precioListaCombo > 0 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "auto", marginTop: 0, padding: "6px 12px", fontSize: 12 }}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        precio_combo_manual: false,
                        precio_combo: String(precioListaCombo),
                      }))
                    }
                  >
                    Usar precio lista (${precioListaCombo.toLocaleString("es-AR")})
                  </button>
                )}
              </div>
            )}

            {form.tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO && (
              <p className="form-hint" style={{ marginBottom: 16 }}>
                El descuento aplica sobre el total del carrito cuando supera el monto mínimo (todos
                los productos cuentan).
              </p>
            )}

            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={guardar}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 8 }}
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
