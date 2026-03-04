import { useState, useRef } from "react";
import { fmt, pctFmt } from "../../lib/format";
import { useInsumos } from "../../hooks/useInsumos";
import { CATEGORIAS } from "../../config/appConfig";
import { costoReceta } from "../../lib/costos";
import { reportError } from "../../utils/errorReport";
import { parsearVozAComprasInsumos } from "../../lib/voiceInsumos";
import InsumosList from "./InsumosList";
import InsumosCompra from "./InsumosCompra";
import InsumosComposicion from "./InsumosComposicion";

function Insumos({
  insumos,
  insumoStock,
  insumoMovimientos,
  insumoComposicion,
  registrarMovimientoInsumo,
  recetas,
  recetaIngredientes,
  onRefresh,
  showToast,
  confirm,
  onVerRecetasAfectadas,
}) {
  const {
    updateInsumo,
    insertInsumo,
    insertPrecioHistorial,
    updateRecetaCostos,
    deleteInsumoComposicion,
    upsertInsumoComposicion,
    deleteInsumo,
  } = useInsumos({ onRefresh, showToast });

  const [search, setSearch] = useState("");
  const [catActiva, setCatActiva] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    categoria: "Harinas",
    presentacion: "",
    precio: "",
    cantidad_presentacion: "",
    unidad: "g",
  });
  const [movModal, setMovModal] = useState(false);
  const [movInsumo, setMovInsumo] = useState(null);
  const [movTipo, setMovTipo] = useState("ingreso");
  const [movCantidad, setMovCantidad] = useState("");
  const [movValor, setMovValor] = useState("");
  const [movSaving, setMovSaving] = useState(false);
  const [detalleInsumo, setDetalleInsumo] = useState(null);
  const [compInsumoSel, setCompInsumoSel] = useState("");
  const [compFactor, setCompFactor] = useState("");
  const [compSaving, setCompSaving] = useState(false);
  const [compraScreenOpen, setCompraScreenOpen] = useState(false);
  const [compraCart, setCompraCart] = useState([]);
  const [compraSaving, setCompraSaving] = useState(false);
  const [precioDecisionModal, setPrecioDecisionModal] = useState(null);
  const [compraResultado, setCompraResultado] = useState(null);
  const [compraListening, setCompraListening] = useState(false);
  const [compraTranscript, setCompraTranscript] = useState("");
  const compraRecRef = useRef(null);
  const compraTranscriptRef = useRef("");

  const filtrados = insumos.filter((i) => {
    const matchCat = catActiva === "Todos" || i.categoria === catActiva;
    const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filtradosOrdenados = [...filtrados].slice().sort((a, b) => {
    const sa = (insumoStock || {})[a.id] ?? 0;
    const sb = (insumoStock || {})[b.id] ?? 0;
    if (sa !== sb) return sa - sb;
    return (a.nombre || "").localeCompare(b.nombre || "", "es", {
      sensitivity: "base",
    });
  });

  const openNew = () => {
    setEditando(null);
    setForm({
      nombre: "",
      categoria: "Harinas",
      presentacion: "",
      precio: "",
      cantidad_presentacion: "",
      unidad: "g",
    });
    setModal(true);
  };
  const openEdit = (i) => {
    setEditando(i);
    setForm({
      nombre: i.nombre,
      categoria: i.categoria,
      presentacion: i.presentacion || "",
      precio: i.precio,
      cantidad_presentacion: i.cantidad_presentacion,
      unidad: i.unidad,
    });
    setModal(true);
  };
  // Reservado para abrir modal de ingreso/egreso desde lista (p. ej. InsumosList)
  // eslint-disable-next-line no-unused-vars
  const openMov = (i, tipo) => {
    setMovInsumo(i);
    setMovTipo(tipo);
    setMovCantidad("");
    setMovValor("");
    setMovModal(true);
  };

  const agregarAlCarritoCompra = (insumo) => {
    if (!insumo) return;
    setCompraCart((prev) => {
      const idx = prev.findIndex((it) => it.insumo.id === insumo.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          presentaciones: copy[idx].presentaciones + 1,
        };
        return copy;
      }
      return [
        ...prev,
        {
          insumo,
          presentaciones: 1,
          precioPresentacion:
            typeof insumo.precio === "number"
              ? insumo.precio
              : Number(insumo.precio) || 0,
          precioOriginal:
            typeof insumo.precio === "number"
              ? insumo.precio
              : Number(insumo.precio) || 0,
        },
      ];
    });
  };

  const actualizarCantidadCarrito = (insumoId, delta) => {
    setCompraCart((prev) =>
      prev
        .map((item) =>
          item.insumo.id === insumoId
            ? {
                ...item,
                presentaciones: Math.max(
                  1,
                  (item.presentaciones || 1) + delta
                ),
              }
            : item
        )
        .filter((item) => (item.presentaciones || 0) > 0)
    );
  };

  const eliminarDeCarritoCompra = (insumoId) => {
    setCompraCart((prev) =>
      prev.filter((item) => item.insumo.id !== insumoId)
    );
  };

  const actualizarPrecioCarrito = (insumoId, value) => {
    const text = String(value).trim();
    if (text === "") {
      setCompraCart((prev) =>
        prev.map((item) =>
          item.insumo.id === insumoId
            ? { ...item, precioPresentacion: "" }
            : item
        )
      );
      return;
    }
    const num = parseFloat(text.replace(",", "."));
    if (Number.isNaN(num) || num < 0) return;
    setCompraCart((prev) =>
      prev.map((item) =>
        item.insumo.id === insumoId
          ? { ...item, precioPresentacion: num }
          : item
      )
    );
  };

  const totalCompra = compraCart.reduce((s, item) => {
    const precio =
      typeof item.precioPresentacion === "number"
        ? item.precioPresentacion
        : Number(item.precioPresentacion) || 0;
    return s + precio * (item.presentaciones || 0);
  }, 0);

  const construirDecisionesPrecio = () => {
    if (!compraCart.length) return null;
    const items = [];
    const originalPrices = {};
    for (const item of compraCart) {
      const ins = item.insumo;
      const anterior = Number(ins.precio) || 0;
      const nuevoValRaw =
        typeof item.precioPresentacion === "number"
          ? item.precioPresentacion
          : Number(item.precioPresentacion) || 0;
      originalPrices[ins.id] = anterior;
      if (!anterior || !nuevoValRaw) continue;
      const diffAbs = Math.abs(nuevoValRaw - anterior);
      if (diffAbs < 0.01) continue;
      const diffPct = anterior ? (nuevoValRaw - anterior) / anterior : null;
      items.push({
        insumoId: ins.id,
        nombre: ins.nombre,
        precioAnterior: anterior,
        precioNuevo: nuevoValRaw,
        diffPct,
        accion: "update",
      });
    }
    if (!items.length) return null;
    return {
      items,
      originalPrices,
      applyToAll: false,
    };
  };

  const registrarCompraSoloStock = async () => {
    if (!compraCart.length) return;
    setCompraSaving(true);
    const totalItems = compraCart.filter(
      (item) => item.insumo?.id && (item.presentaciones || 0) > 0
    ).length;
    let okCount = 0;
    try {
      for (const item of compraCart) {
        const ins = item.insumo;
        const presentaciones = item.presentaciones || 0;
        if (!ins.id || presentaciones <= 0) continue;
        const unidadCantidad = Number(ins.cantidad_presentacion) || 1;
        const cantidadTotal = presentaciones * unidadCantidad;
        const precio =
          typeof item.precioPresentacion === "number"
            ? item.precioPresentacion
            : Number(item.precioPresentacion) || 0;
        const valorMovimiento =
          precio > 0 ? precio * presentaciones : null;
        await registrarMovimientoInsumo(
          ins.id,
          "ingreso",
          cantidadTotal,
          valorMovimiento
        );
        okCount += 1;
      }
      showToast("✅ Compra de stock registrada");
      setCompraCart([]);
      setCompraScreenOpen(false);
      onRefresh();
    } catch (err) {
      reportError(err, { action: "registrarCompraStock" });
      if (okCount > 0) {
        showToast(`⚠️ Se registraron ${okCount} de ${totalItems}; error en el resto. Revisá el carrito.`);
      } else {
        showToast("⚠️ Error al registrar compra");
      }
    } finally {
      setCompraSaving(false);
    }
  };

  const confirmarCompra = async () => {
    if (!compraCart.length || compraSaving) return;
    const tienePrecioInvalido = compraCart.some((item) => {
      const precio =
        typeof item.precioPresentacion === "number"
          ? item.precioPresentacion
          : Number(item.precioPresentacion) || 0;
      return precio <= 0;
    });
    if (tienePrecioInvalido) {
      showToast(
        "⚠️ Completá el precio de todos los insumos (mayor a 0)"
      );
      return;
    }
    const decisiones = construirDecisionesPrecio();
    if (!decisiones) {
      await registrarCompraSoloStock();
      return;
    }
    setPrecioDecisionModal(decisiones);
  };

  const aplicarDecisionesPrecio = async () => {
    if (!precioDecisionModal || !compraCart.length) return;
    const { items } = precioDecisionModal;
    const cambiosAplicar = items.filter((it) => it.accion === "update");
    if (!cambiosAplicar.length) {
      await registrarCompraSoloStock();
      setPrecioDecisionModal(null);
      return;
    }
    setCompraSaving(true);
    try {
      for (const item of compraCart) {
        const ins = item.insumo;
        const presentaciones = item.presentaciones || 0;
        if (!ins.id || presentaciones <= 0) continue;
        const unidadCantidad = Number(ins.cantidad_presentacion) || 1;
        const cantidadTotal = presentaciones * unidadCantidad;
        const precio =
          typeof item.precioPresentacion === "number"
            ? item.precioPresentacion
            : Number(item.precioPresentacion) || 0;
        const valorMovimiento =
          precio > 0 ? precio * presentaciones : null;
        await registrarMovimientoInsumo(
          ins.id,
          "ingreso",
          cantidadTotal,
          valorMovimiento
        );
      }

      const preciosOriginales = {};
      const preciosNuevos = {};
      const preciosErrores = [];
      for (const cambio of cambiosAplicar) {
        preciosOriginales[cambio.insumoId] = cambio.precioAnterior;
        preciosNuevos[cambio.insumoId] = cambio.precioNuevo;
        try {
          await updateInsumo(cambio.insumoId, { precio: cambio.precioNuevo });
          await insertPrecioHistorial({
            insumo_id: cambio.insumoId,
            precio_anterior: cambio.precioAnterior,
            precio_nuevo: cambio.precioNuevo,
            motivo: "compra_stock",
          });
        } catch (err) {
          reportError(err, { action: "aplicarDecisionesPrecioItem", insumoId: cambio.insumoId });
          preciosErrores.push(cambio.nombre || cambio.insumoId);
        }
      }
      if (preciosErrores.length > 0) {
        showToast(
          `⚠️ No se pudo actualizar precio de: ${preciosErrores.slice(0, 2).join(", ")}${preciosErrores.length > 2 ? "…" : ""}`
        );
      }

      const recetasPorId = Object.fromEntries(
        (recetas || []).map((r) => [r.id, r])
      );
      const recetasAfectadasIds = new Set();
      for (const cambio of cambiosAplicar) {
        const recsIds = (recetaIngredientes || [])
          .filter((ri) => ri.insumo_id === cambio.insumoId)
          .map((ri) => ri.receta_id);
        for (const id of recsIds) {
          if (id) recetasAfectadasIds.add(id);
        }
      }

      const insumosById = Object.fromEntries(
        (insumos || []).map((i) => [i.id, i])
      );
      const insumosBefore = Object.values(insumosById).map((i) => ({
        ...i,
        precio:
          preciosOriginales[i.id] != null
            ? preciosOriginales[i.id]
            : i.precio,
      }));
      const insumosAfter = Object.values(insumosById).map((i) => ({
        ...i,
        precio:
          preciosNuevos[i.id] != null ? preciosNuevos[i.id] : i.precio,
      }));

      const recetasAfectadas = [];
      const costosErrores = [];
      for (const recId of recetasAfectadasIds) {
        const receta = recetasPorId[recId];
        if (!receta) continue;
        const rindeNum = Number(receta.rinde) || 1;
        const costoAntes = costoReceta(
          recId,
          recetaIngredientes || [],
          insumosBefore,
          recetas || []
        );
        const costoDespues = costoReceta(
          recId,
          recetaIngredientes || [],
          insumosAfter,
          recetas || []
        );
        const costoUnitAntes =
          rindeNum > 0 ? costoAntes / rindeNum : 0;
        const costoUnitDespues =
          rindeNum > 0 ? costoDespues / rindeNum : 0;
        const precioVenta = Number(receta.precio_venta) || 0;
        const margenAntes =
          precioVenta > 0
            ? (precioVenta - costoUnitAntes) / precioVenta
            : null;
        const margenDespues =
          precioVenta > 0
            ? (precioVenta - costoUnitDespues) / precioVenta
            : null;

        try {
          await updateRecetaCostos(recId, {
            costo_lote: costoDespues,
            costo_unitario: costoUnitDespues,
          });
        } catch (err) {
          reportError(err, { action: "aplicarDecisionesPrecioReceta", recetaId: recId });
          costosErrores.push(receta.nombre || recId);
        }

        recetasAfectadas.push({
          id: recId,
          nombre: receta.nombre,
          emoji: receta.emoji || "🍞",
          margenAntes,
          margenDespues,
        });
      }
      if (costosErrores.length > 0) {
        showToast(
          `⚠️ No se pudo actualizar costo de receta(s): ${costosErrores.slice(0, 2).join(", ")}${costosErrores.length > 2 ? "…" : ""}`
        );
      }

      setCompraResultado({
        preciosActualizados: cambiosAplicar.length,
        recetasAfectadas,
      });
      showToast("✅ Compra registrada y costos actualizados");
      setPrecioDecisionModal(null);
      setCompraCart([]);
      onRefresh();
    } catch (err) {
      reportError(err, { action: "actualizarPreciosPorCompra" });
      showToast("⚠️ Error al actualizar precios y costos");
    } finally {
      setCompraSaving(false);
    }
  };

  const iniciarRecCompra = () => {
    if (compraListening) return;
    const API =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!API) {
      showToast(
        "⚠️ Tu navegador no soporta reconocimiento de voz"
      );
      return;
    }
    setCompraTranscript("");
    compraTranscriptRef.current = "";
    try {
      const rec = new API();
      compraRecRef.current = rec;
      rec.lang = "es-AR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) {
            compraTranscriptRef.current +=
              (compraTranscriptRef.current ? " " : "") +
              res[0].transcript;
            setCompraTranscript(compraTranscriptRef.current);
          }
        }
      };
      rec.onend = () => {
        setCompraListening(false);
        compraRecRef.current = null;
        const texto = compraTranscriptRef.current;
        if (!texto) return;
        const items = parsearVozAComprasInsumos(texto, insumos);
        if (!items.length) {
          showToast(
            "No se detectaron insumos. Probá con nombres más específicos."
          );
          return;
        }
        setCompraCart((prev) => {
          const merged = [...prev];
          for (const it of items) {
            const ins = it.insumo;
            const idx = merged.findIndex(
              (m) => m.insumo.id === ins.id
            );
            if (idx >= 0) {
              const base = merged[idx];
              const presBase = base.presentaciones || 0;
              merged[idx] = {
                ...base,
                presentaciones:
                  presBase + (it.presentaciones || 0),
                precioPresentacion:
                  it.precioPresentacion != null
                    ? it.precioPresentacion
                    : base.precioPresentacion,
              };
            } else {
              merged.push({
                insumo: ins,
                presentaciones: it.presentaciones || 1,
                precioPresentacion:
                  it.precioPresentacion != null
                    ? it.precioPresentacion
                    : typeof ins.precio === "number"
                    ? ins.precio
                    : Number(ins.precio) || 0,
                precioOriginal:
                  typeof ins.precio === "number"
                    ? ins.precio
                    : Number(ins.precio) || 0,
              });
            }
          }
          return merged;
        });
        showToast(
          `✅ Compra por voz: ${items.length} insumo(s) agregados`
        );
      };
      rec.start();
      setCompraListening(true);
    } catch {
      setCompraListening(false);
      compraRecRef.current = null;
      showToast("⚠️ No se pudo iniciar el reconocimiento de voz");
    }
  };

  const detenerRecCompra = () => {
    try {
      compraRecRef.current?.abort?.();
    } catch {
      // ignore
    }
    try {
      compraRecRef.current?.stop?.();
    } catch {
      // ignore
    }
    compraRecRef.current = null;
    setCompraListening(false);
  };

  const save = async () => {
    const precio = parseFloat(form.precio);
    const cantidad_presentacion =
      parseFloat(form.cantidad_presentacion) || 0;
    if (isNaN(precio) || precio <= 0) {
      showToast("⚠️ Precio inválido");
      return;
    }
    setSaving(true);
    const data = {
      nombre: form.nombre,
      categoria: form.categoria,
      presentacion: form.presentacion,
      precio,
      cantidad_presentacion,
      unidad: form.unidad,
    };
    const isUpdate = Boolean(editando);
    const precioAnterior =
      isUpdate && editando
        ? typeof editando.precio === "number"
          ? editando.precio
          : Number(editando.precio) || 0
        : null;
    try {
      if (isUpdate) {
        await updateInsumo(editando.id, data);
      } else {
        await insertInsumo(data);
      }
    } catch {
      showToast("⚠️ Error al guardar");
      setSaving(false);
      return;
    }
    let successMessage = isUpdate ? "✅ Precio actualizado" : "✅ Insumo agregado";
    if (
      isUpdate &&
      precioAnterior != null &&
      Math.abs(precio - precioAnterior) >= 0.01
    ) {
      const insumoId = editando.id;
      try {
        await insertPrecioHistorial({
          insumo_id: insumoId,
          precio_anterior: precioAnterior,
          precio_nuevo: precio,
          motivo: "edicion_manual",
        });
      } catch (err) {
        reportError(err, { action: "saveInsumoHistorial", insumo_id: insumoId });
        successMessage = "✅ Insumo guardado (no se pudo registrar historial de precio)";
      }
    }
    showToast(successMessage);
    setSaving(false);
    setModal(false);
    onRefresh();
  };

  const guardarMovimiento = async () => {
    const cant = parseFloat(movCantidad);
    if (!movInsumo || !cant || cant <= 0) return;
    setMovSaving(true);
    try {
      await registrarMovimientoInsumo(
        movInsumo.id,
        movTipo,
        cant,
        movValor ? parseFloat(movValor) : null
      );
      showToast(
        movTipo === "ingreso"
          ? `✅ +${cant} ${movInsumo.nombre}`
          : `✅ Egreso: -${cant} ${movInsumo.nombre}`
      );
      setMovModal(false);
      onRefresh();
    } catch {
      showToast("⚠️ Error al registrar movimiento");
    } finally {
      setMovSaving(false);
    }
  };

  const precioPorU = (i) => {
    const den = i.cantidad_presentacion > 0 ? i.cantidad_presentacion : 1;
    const p = (i.precio || 0) / den;
    return i.unidad === "u" ? `${fmt(p)}/u` : `${fmt(p)}/${i.unidad || "g"}`;
  };

  const insumosMap = Object.fromEntries(insumos.map((i) => [i.id, i]));

  return (
    <div className="content">
      <p className="page-title">Insumos</p>
      <p className="page-subtitle">
        {insumos.length} materias primas · ingresos y egresos para calcular
        ganancia
      </p>

      <InsumosList
        search={search}
        setSearch={setSearch}
        catActiva={catActiva}
        setCatActiva={setCatActiva}
        filtradosOrdenados={filtradosOrdenados}
        insumoStock={insumoStock}
        insumosMap={insumosMap}
        insumoMovimientos={insumoMovimientos}
        precioPorU={precioPorU}
        onDetalle={setDetalleInsumo}
        onAbrirCompra={() => setCompraScreenOpen(true)}
        onNuevoInsumo={openNew}
        fmt={fmt}
      />

      {compraScreenOpen && (
        <InsumosCompra
          compraCart={compraCart}
          compraSaving={compraSaving}
          compraListening={compraListening}
          compraTranscript={compraTranscript}
          insumos={insumos}
          insumoStock={insumoStock}
          totalCompra={totalCompra}
          precioPorU={precioPorU}
          onBack={() => {
            if (compraSaving) return;
            setCompraScreenOpen(false);
          }}
          onHablar={iniciarRecCompra}
          onDetener={detenerRecCompra}
          agregarAlCarrito={agregarAlCarritoCompra}
          actualizarCantidadCarrito={actualizarCantidadCarrito}
          actualizarPrecioCarrito={actualizarPrecioCarrito}
          eliminarDeCarrito={eliminarDeCarritoCompra}
          confirmarCompra={confirmarCompra}
          showToast={showToast}
        />
      )}


      {movModal && movInsumo && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setMovModal(false)}
            >
              ← Volver
            </button>
            <span className="screen-title">
              {movTipo === "ingreso" ? "📥 Ingreso" : "📤 Egreso"} ·{" "}
              {movInsumo.nombre}
            </span>
          </div>
          <div className="screen-content">
            <div className="form-group">
              <label className="form-label">
                Cantidad ({movInsumo.unidad || "g"})
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="any"
                value={movCantidad}
                onChange={(e) => setMovCantidad(e.target.value)}
                placeholder="Ej: 500"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Valor $ (opcional)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={movValor}
                onChange={(e) => setMovValor(e.target.value)}
                placeholder="Costo o valor del movimiento"
              />
            </div>
            <button
              className="btn-primary"
              onClick={guardarMovimiento}
              disabled={
                movSaving ||
                !movCantidad ||
                parseFloat(movCantidad) <= 0
              }
            >
              {movSaving
                ? "Guardando..."
                : movTipo === "ingreso"
                ? "Registrar ingreso"
                : "Registrar egreso"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setMovModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {modal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setModal(false)}
            >
              ← Volver
            </button>
            <span className="screen-title">
              {editando ? "Editar insumo" : "Nuevo insumo"}
            </span>
          </div>
          <div className="screen-content">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                className="form-input"
                value={form.nombre}
                onChange={(e) =>
                  setForm({ ...form, nombre: e.target.value })
                }
                placeholder="Ej: Harina de almendras"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value })
                }
              >
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Precio ($)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.precio}
                  onChange={(e) =>
                    setForm({ ...form, precio: e.target.value })
                  }
                  placeholder="4500"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Presentación</label>
                <input
                  className="form-input"
                  value={form.presentacion}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      presentacion: e.target.value,
                    })
                  }
                  placeholder="x 30 u"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cantidad</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.cantidad_presentacion}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cantidad_presentacion: e.target.value,
                    })
                  }
                  placeholder="30"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select
                  className="form-select"
                  value={form.unidad}
                  onChange={(e) =>
                    setForm({ ...form, unidad: e.target.value })
                  }
                >
                  {["g", "ml", "u", "kg", "l"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={save}
              disabled={saving || !form.nombre || !form.precio}
            >
              {saving
                ? "Guardando..."
                : editando
                ? "Guardar cambios"
                : "Agregar insumo"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {detalleInsumo && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setDetalleInsumo(null)}
            >
              ← Volver
            </button>
            <span className="screen-title">
              {detalleInsumo.nombre}
            </span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Detalle</span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                <strong>Categoría:</strong> {detalleInsumo.categoria}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                <strong>Presentación:</strong>{" "}
                {detalleInsumo.presentacion || "—"}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                <strong>Precio:</strong>{" "}
                {fmt(detalleInsumo.precio || 0)} (
                {precioPorU(detalleInsumo)})
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                <strong>Stock:</strong>{" "}
                {(insumoStock || {})[detalleInsumo.id] ?? 0}{" "}
                {detalleInsumo.unidad || "g"}
              </p>
            </div>

            <InsumosComposicion
              detalleInsumo={detalleInsumo}
              insumos={insumos}
              insumoComposicion={insumoComposicion}
              compInsumoSel={compInsumoSel}
              setCompInsumoSel={setCompInsumoSel}
              compFactor={compFactor}
              setCompFactor={setCompFactor}
              compSaving={compSaving}
              setCompSaving={setCompSaving}
              onDeleteComposicion={deleteInsumoComposicion}
              onUpsertComposicion={upsertInsumoComposicion}
              confirm={confirm}
              showToast={showToast}
            />

            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              Para registrar compras (ingresos), usá &quot;Registrar compra de stock&quot; arriba.
            </p>

            <button
              className="btn-secondary"
              onClick={() => {
                setDetalleInsumo(null);
                openEdit(detalleInsumo);
              }}
              style={{ marginBottom: 8 }}
            >
              ✏️ Editar insumo
            </button>
            <button
              className="btn-danger"
              onClick={async () => {
                if (
                  !(await confirm(
                    `¿Eliminar el insumo "${detalleInsumo.nombre}"?`,
                    { destructive: true }
                  ))
                )
                  return;
                try {
                  await deleteInsumo(detalleInsumo.id);
                  setDetalleInsumo(null);
                } catch {
                  showToast(
                    "⚠️ No se pudo eliminar (en uso en recetas o movimientos)"
                  );
                }
              }}
            >
              Eliminar insumo
            </button>
          </div>
        </div>
      )}

      {precioDecisionModal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setPrecioDecisionModal(null)}
              disabled={compraSaving}
            >
              ← Volver
            </button>
            <span className="screen-title">Precios actualizados</span>
          </div>
          <div className="screen-content">
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Algunos insumos tienen un precio distinto al registrado.
              Elegí qué hacer con cada uno:
            </p>
            <div className="card" style={{ marginBottom: 16 }}>
              {(precioDecisionModal.items || []).map((item) => {
                const insumoId = item.insumoId;
                const accion = item.accion || "update";
                return (
                  <div
                    key={insumoId}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{ fontWeight: 600, marginBottom: 4 }}
                    >
                      {item.nombre}
                    </div>
                    <div
                      style={{
                        color: "var(--text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      Precio anterior:{" "}
                      <strong>{fmt(item.precioAnterior)}</strong>
                      <br />
                      Precio nuevo:{" "}
                      <strong>{fmt(item.precioNuevo)}</strong>
                      {item.diffPct != null && (
                        <>
                          <br />
                          Diferencia:{" "}
                          <strong
                            style={{
                              color:
                                item.diffPct > 0
                                  ? "var(--danger)"
                                  : "var(--green)",
                            }}
                          >
                            {pctFmt(item.diffPct)}
                          </strong>
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <button
                        type="button"
                        className={accion === "update" ? "btn-primary" : "btn-secondary"}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          fontSize: 12,
                          borderRadius: 10,
                        }}
                        onClick={() =>
                          setPrecioDecisionModal((prev) => ({
                            ...prev,
                            items: (prev.items || []).map((it) =>
                              it.insumoId === insumoId
                                ? { ...it, accion: "update" }
                                : it
                            ),
                          }))
                        }
                        disabled={compraSaving}
                      >
                        ✅ Actualizar precio
                      </button>
                      <button
                        type="button"
                        className={accion === "keep" ? "btn-primary" : "btn-secondary"}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          fontSize: 12,
                          borderRadius: 10,
                        }}
                        onClick={() =>
                          setPrecioDecisionModal((prev) => ({
                            ...prev,
                            items: (prev.items || []).map((it) =>
                              it.insumoId === insumoId
                                ? { ...it, accion: "keep" }
                                : it
                            ),
                          }))
                        }
                        disabled={compraSaving}
                      >
                        🕓 Mantener precio anterior
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Si no querés cambiar ningún precio, elegí &quot;Mantener precio anterior&quot; en cada uno.
            </p>
            <button
              className="btn-primary"
              onClick={aplicarDecisionesPrecio}
              disabled={compraSaving}
            >
              {compraSaving
                ? "Guardando…"
                : "Registrar compra"}
            </button>
          </div>
        </div>
      )}

      {compraResultado && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setCompraResultado(null)}
            >
              ← Cerrar
            </button>
            <span className="screen-title">
              Resumen de actualización
            </span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">
                  Se actualizaron{" "}
                  {compraResultado.preciosActualizados} precios
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                Estos cambios impactaron en las recetas y sus márgenes:
              </p>
            </div>
            {compraResultado.recetasAfectadas &&
              compraResultado.recetasAfectadas.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header">
                    <span className="card-title">
                      Recetas afectadas
                    </span>
                  </div>
                  {compraResultado.recetasAfectadas.map((r) => {
                    const margenAntesTxt =
                      r.margenAntes != null
                        ? pctFmt(r.margenAntes)
                        : "—";
                    const margenDespuesTxt =
                      r.margenDespues != null
                        ? pctFmt(r.margenDespues)
                        : "—";
                    const empeoro =
                      r.margenAntes != null &&
                      r.margenDespues != null &&
                      r.margenDespues < r.margenAntes;
                    return (
                      <div
                        key={r.id}
                        className="insumo-item"
                        style={{ padding: "8px 0" }}
                      >
                        <div
                          className="insumo-info"
                          style={{ flex: 1 }}
                        >
                          <div className="insumo-nombre">
                            {r.emoji} {r.nombre}
                          </div>
                          <div className="insumo-detalle">
                            Margen:{" "}
                            <strong>{margenAntesTxt}</strong> →{" "}
                            <strong
                              style={{
                                color: empeoro
                                  ? "var(--danger)"
                                  : "var(--green)",
                              }}
                            >
                              {margenDespuesTxt}
                            </strong>{" "}
                            {empeoro ? "↓" : "↑"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Revisá si necesitás ajustar precios de venta.
            </p>
            {compraResultado.recetasAfectadas &&
              compraResultado.recetasAfectadas.length > 0 &&
              onVerRecetasAfectadas && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    const ids = compraResultado.recetasAfectadas.map(
                      (r) => r.id
                    );
                    onVerRecetasAfectadas(ids);
                    setCompraResultado(null);
                  }}
                  style={{ marginBottom: 8 }}
                >
                  Ver recetas afectadas
                </button>
              )}
            <button
              className="btn-secondary"
              onClick={() => setCompraResultado(null)}
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Insumos;

