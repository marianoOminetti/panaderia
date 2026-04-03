/**
 * Pantallas de detalle desde Analytics (mismo período ya seleccionado: semana o mes).
 */
import { useMemo, useState } from "react";
import { fmt, pctFmt } from "../../lib/format";
import {
  makeGetCostoLinea,
  aggregateProductosPeriodo,
  aggregateClientesPeriodo,
  productosPorClienteEnPeriodo,
  gruposVentasPeriodo,
} from "../../lib/analyticsDrillHelpers";

const DIAS_SEMANA_LUN_DOM = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function DrillHeader({ title, periodLabel, onBack }) {
  return (
    <div
      className="analytics-detail-header"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <button type="button" className="screen-back" onClick={onBack}>
        ← Volver
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-title" style={{ margin: 0, fontSize: 18 }}>
          {title}
        </div>
        <p
          className="page-subtitle"
          style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.35 }}
        >
          {periodLabel}
        </p>
      </div>
    </div>
  );
}

function DrillTableRow({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 8,
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
        fontSize: 14,
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

export default function AnalyticsDrilldown({
  drill,
  onBack,
  periodLabel,
  ventasPeriodo,
  data,
  recetas,
  clientes,
  recetaIngredientes,
  insumos,
  fechasVentasPeriodo,
  onAbrirEnVentas,
}) {
  const getCostoLinea = useMemo(
    () => makeGetCostoLinea(recetas, recetaIngredientes, insumos),
    [recetas, recetaIngredientes, insumos]
  );

  const productosRows = useMemo(
    () => aggregateProductosPeriodo(ventasPeriodo, recetas, getCostoLinea),
    [ventasPeriodo, recetas, getCostoLinea]
  );

  const clientesRows = useMemo(
    () => aggregateClientesPeriodo(ventasPeriodo, clientes),
    [ventasPeriodo, clientes]
  );

  const productosPorCliente = useMemo(
    () => productosPorClienteEnPeriodo(ventasPeriodo, recetas),
    [ventasPeriodo, recetas]
  );

  const gruposVentas = useMemo(
    () => gruposVentasPeriodo(ventasPeriodo),
    [ventasPeriodo]
  );

  const [sortVendidos, setSortVendidos] = useState("unidades");
  const [sortRent, setSortRent] = useState("ganancia");
  const [busquedaVentas, setBusquedaVentas] = useState("");
  /** Clave __sin_cliente__ o id cliente — drill clientes */
  const [clienteExpandido, setClienteExpandido] = useState(null);

  const vendidosSorted = useMemo(() => {
    const arr = [...productosRows].filter((r) => (r.unidades || 0) > 0);
    arr.sort((a, b) => {
      if (sortVendidos === "ingreso") return b.ingreso - a.ingreso;
      return b.unidades - a.unidades;
    });
    return arr;
  }, [productosRows, sortVendidos]);

  const rentSorted = useMemo(() => {
    const arr = [...productosRows];
    arr.sort((a, b) => {
      if (sortRent === "margen") {
        const ma = a.margen ?? -1;
        const mb = b.margen ?? -1;
        return mb - ma;
      }
      if (sortRent === "ingreso") return b.ingreso - a.ingreso;
      return b.ganancia - a.ganancia;
    });
    return arr;
  }, [productosRows, sortRent]);

  const totalUnidades = vendidosSorted.reduce((s, r) => s + (r.unidades || 0), 0);
  const totalIngresoProd = vendidosSorted.reduce((s, r) => s + r.ingreso, 0);

  const gruposFiltrados = useMemo(() => {
    const q = busquedaVentas.trim().toLowerCase();
    if (!q) return gruposVentas;
    return gruposVentas.filter((g) => {
      const raw = g.rawItems?.[0] || g.items?.[0];
      const fecha = raw?.fecha ? String(raw.fecha).slice(0, 10) : "";
      const cname =
        g.cliente_id == null
          ? "consumidor"
          : (
              clientes.find((c) => c.id === g.cliente_id)?.nombre || ""
            ).toLowerCase();
      const totalStr = String(Math.round(g.total));
      return (
        fecha.includes(q) ||
        cname.includes(q) ||
        totalStr.includes(q) ||
        g.key?.toLowerCase?.().includes(q)
      );
    });
  }, [gruposVentas, busquedaVentas, clientes]);

  if (!drill?.tipo) return null;

  const { tipo } = drill;

  if (tipo === "productos-vendidos") {
    return (
      <div className="content">
        <DrillHeader
          title="Productos vendidos"
          periodLabel={periodLabel}
          onBack={onBack}
        />
        <div className="card">
          <div
            className="card-header"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            <span className="card-title">Ordenar por</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={
                  sortVendidos === "unidades" ? "btn-primary" : "btn-secondary"
                }
                style={{ fontSize: 13, width: "auto", padding: "8px 14px", marginTop: 0 }}
                onClick={() => setSortVendidos("unidades")}
              >
                Unidades
              </button>
              <button
                type="button"
                className={
                  sortVendidos === "ingreso" ? "btn-primary" : "btn-secondary"
                }
                style={{ fontSize: 13, width: "auto", padding: "8px 14px", marginTop: 0 }}
                onClick={() => setSortVendidos("ingreso")}
              >
                Ingreso
              </button>
            </div>
          </div>
          {vendidosSorted.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🥐</div>
              <p>No hay ventas con producto en este período.</p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                Total: {totalUnidades} u · {fmt(totalIngresoProd)}
              </div>
              <div>
                {vendidosSorted.map((row) => (
                  <DrillTableRow key={row.receta_id ?? "sin"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{row.receta?.emoji || "🍞"}</span>
                      <span>{row.receta?.nombre || "Sin nombre"}</span>
                    </div>
                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {row.unidades} u · {fmt(row.ingreso)}
                    </div>
                  </DrillTableRow>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (tipo === "productos-rentables") {
    return (
      <div className="content">
        <DrillHeader
          title="Rentabilidad por producto"
          periodLabel={periodLabel}
          onBack={onBack}
        />
        <div className="card">
          <div
            className="card-header"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            <span className="card-title">Ordenar por</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={
                  sortRent === "ganancia" ? "btn-primary" : "btn-secondary"
                }
                style={{ fontSize: 13, width: "auto", padding: "8px 14px", marginTop: 0 }}
                onClick={() => setSortRent("ganancia")}
              >
                Ganancia
              </button>
              <button
                type="button"
                className={
                  sortRent === "margen" ? "btn-primary" : "btn-secondary"
                }
                style={{ fontSize: 13, width: "auto", padding: "8px 14px", marginTop: 0 }}
                onClick={() => setSortRent("margen")}
              >
                Margen %
              </button>
              <button
                type="button"
                className={
                  sortRent === "ingreso" ? "btn-primary" : "btn-secondary"
                }
                style={{ fontSize: 13, width: "auto", padding: "8px 14px", marginTop: 0 }}
                onClick={() => setSortRent("ingreso")}
              >
                Ingreso
              </button>
            </div>
          </div>
          {rentSorted.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">💸</div>
              <p>No hay líneas en este período.</p>
            </div>
          ) : (
            <div>
              {rentSorted.map((row) => (
                <DrillTableRow key={row.receta_id ?? "sin"}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{row.receta?.emoji || "🍞"}</span>
                      <span>{row.receta?.nombre || "Sin nombre"}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      Ingreso {fmt(row.ingreso)} · Costo {fmt(row.costo)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>{fmt(row.ganancia)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {row.margen != null ? pctFmt(row.margen) : "—"}
                    </div>
                  </div>
                </DrillTableRow>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tipo === "clientes") {
    return (
      <div className="content">
        <DrillHeader
          title="Clientes en el período"
          periodLabel={periodLabel}
          onBack={onBack}
        />
        <div className="card">
          {clientesRows.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">👤</div>
              <p>No hay ventas en este período.</p>
            </div>
          ) : (
            <>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  margin: "0 0 12px",
                  lineHeight: 1.4,
                }}
              >
                Tocá un cliente para ver qué productos llevó en este período.
              </p>
              <div>
                {clientesRows.map((row, idx) => {
                  const key =
                    row.cliente_id == null
                      ? "__sin_cliente__"
                      : String(row.cliente_id);
                  const abierto = clienteExpandido === key;
                  const lineasProd = productosPorCliente.get(key) || [];
                  return (
                    <div
                      key={row.cliente_id ?? `s-${idx}`}
                      style={{
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <button
                        type="button"
                        className="analytics-drill-accordion-btn"
                        onClick={() =>
                          setClienteExpandido(abierto ? null : key)
                        }
                        aria-expanded={abierto}
                        aria-controls={`analytics-cliente-detalle-${key}`}
                        id={`analytics-cliente-trigger-${key}`}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>
                            {row.cliente.nombre}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              marginTop: 2,
                            }}
                          >
                            {row.lineas}{" "}
                            {row.lineas === 1 ? "línea" : "líneas"}
                          </div>
                        </div>
                        <span
                          className="analytics-drill-accordion-chevron"
                          aria-hidden
                        >
                          {abierto ? "▾" : "▸"}
                        </span>
                        <div
                          style={{
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {fmt(row.total)}
                        </div>
                      </button>
                      {abierto && (
                        <div
                          id={`analytics-cliente-detalle-${key}`}
                          role="region"
                          aria-labelledby={`analytics-cliente-trigger-${key}`}
                          className="analytics-drill-cliente-detalle"
                        >
                          {lineasProd.length === 0 ? (
                            <p
                              style={{
                                fontSize: 13,
                                color: "var(--text-muted)",
                                margin: "4px 10px",
                              }}
                            >
                              Sin detalle de productos.
                            </p>
                          ) : (
                            lineasProd.map((p) => (
                              <div
                                key={p.receta_id ?? "sin"}
                                className="analytics-drill-cliente-detalle-row"
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    minWidth: 0,
                                  }}
                                >
                                  <span>{p.receta?.emoji || "🍞"}</span>
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {p.receta?.nombre || "Sin nombre"}
                                  </span>
                                </div>
                                <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                                  {p.unidades} u · {fmt(p.ingreso)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (tipo === "ventas") {
    return (
      <div className="content">
        <DrillHeader
          title="Ventas agrupadas"
          periodLabel={periodLabel}
          onBack={onBack}
        />
        <div className="card">
          <div className="search-bar" style={{ marginBottom: 12 }}>
            <span className="search-icon">🔍</span>
            <input
              type="search"
              placeholder="Buscar por fecha, cliente o importe…"
              value={busquedaVentas}
              onChange={(e) => setBusquedaVentas(e.target.value)}
              aria-label="Filtrar ventas"
            />
          </div>
          {gruposFiltrados.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📋</div>
              <p>No hay resultados.</p>
            </div>
          ) : (
            <div>
              {gruposFiltrados.map((g) => {
                const raw = g.rawItems?.[0] || g.items?.[0];
                const fecha = raw?.fecha
                  ? String(raw.fecha).slice(0, 10)
                  : "—";
                const nombreCli =
                  g.cliente_id == null
                    ? "Consumidor final"
                    : clientes.find((c) => c.id === g.cliente_id)?.nombre ||
                      "Cliente";
                return (
                  <DrillTableRow key={g.key}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{nombreCli}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {fecha}
                        {g.items?.length > 1
                          ? ` · ${g.items.length} ítems`
                          : ""}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600 }}>{fmt(g.total)}</div>
                  </DrillTableRow>
                );
              })}
            </div>
          )}
        </div>
        {onAbrirEnVentas &&
          fechasVentasPeriodo?.desde &&
          fechasVentasPeriodo?.hasta && (
            <div className="card" style={{ marginTop: 12 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  margin: "0 0 12px",
                  lineHeight: 1.45,
                }}
              >
                En Ventas vas a ver el mismo rango de fechas, con la lista completa y las acciones habituales
                (editar, cobrar deuda, etc.).
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => onAbrirEnVentas()}
              >
                Abrir en Ventas
              </button>
            </div>
          )}
      </div>
    );
  }

  if (tipo === "ingreso-por-dia") {
    const arr = data.ingresoPorDiaSemana || [];
    return (
      <div className="content">
        <DrillHeader
          title="Ingreso por día"
          periodLabel={periodLabel}
          onBack={onBack}
        />
        <div className="card">
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            Lunes a domingo de la semana seleccionada.
          </p>
          <div>
            {DIAS_SEMANA_LUN_DOM.map((label, idx) => (
              <DrillTableRow key={label}>
                <span>{label}</span>
                <span style={{ fontWeight: 600 }}>{fmt(arr[idx] || 0)}</span>
              </DrillTableRow>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tipo === "ingreso-dia-mes") {
    const arr = data.ingresoPorDiaMesLunDom || [];
    return (
      <div className="content">
        <DrillHeader
          title="Ingreso por día de la semana (en el mes)"
          periodLabel={periodLabel}
          onBack={onBack}
        />
        <div className="card">
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            Suma de todo el mes según si la venta fue lunes, martes, etc.
          </p>
          <div>
            {arr.map((row) => (
              <DrillTableRow key={row.label}>
                <span>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{fmt(row.ingreso)}</span>
              </DrillTableRow>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
