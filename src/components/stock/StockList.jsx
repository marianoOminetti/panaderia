/**
 * Lista de stock por receta: prioridades de producción, métricas (días restantes), pedidos pendientes y botón cargar.
 * Recibe datos calculados desde Stock.jsx; al "Cargar" abre StockProductionModal (controlado por el padre).
 */
import { useState } from "react";
import {
  DIAS_OBJETIVO_PRODUCCION,
  METRICAS_VENTANA_DIAS,
} from "../../config/appConfig";
import { fmtStock } from "../../lib/format";
import { formatearDiasStock } from "../../lib/metrics";

function StockList({
  prioridadesProduccion,
  recetasOrdenadasPorStock,
  stock,
  metricasStock,
  pedidosPendientesSemana,
  onAjustarStock,
}) {
  const [prioridadesAbierto, setPrioridadesAbierto] = useState(false);

  return (
    <>
      {prioridadesProduccion.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setPrioridadesAbierto((v) => !v)}
            className="card-header"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "12px 16px",
              textAlign: "left",
            }}
          >
            <span className="card-title">Prioridades de producción</span>
            <span
              style={{
                fontSize: 18,
                color: "var(--text-muted)",
                transition: "transform 0.2s ease",
                transform: prioridadesAbierto ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▼
            </span>
          </button>
          {prioridadesAbierto && (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  padding: "0 16px 8px",
                }}
              >
                Ordenado por urgencia (sin stock, pedidos y ventas).
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "0 16px 16px",
                }}
              >
                {prioridadesProduccion.map((p) => {
              const {
                receta: r,
                stockActual,
                metrica,
                diasRestantes,
                pedidosSemana,
                faltaPedidos,
              } = p;
              const diasTexto =
                diasRestantes != null &&
                Number.isFinite(diasRestantes)
                  ? formatearDiasStock(diasRestantes)
                  : null;
              return (
                <div
                  key={r.id}
                  className="insumo-item"
                  style={{
                    alignItems: "center",
                    padding: "6px 0",
                  }}
                >
                  <span style={{ fontSize: 22, marginRight: 8 }}>
                    {r.emoji}
                  </span>
                  <div className="insumo-info" style={{ flex: 1 }}>
                    <div className="insumo-nombre">{r.nombre}</div>
                    <div
                      className="insumo-detalle"
                      style={{ fontSize: 12 }}
                    >
                      {stockActual <= 0
                        ? "Sin stock"
                        : `Stock: ${fmtStock(stockActual)}`}{" "}
                      {metrica && metrica.promedioDiario > 0 && (
                        <>
                          · prom.{" "}
                          {metrica.promedioDiario.toFixed(1)} u/día ·{" "}
                          {diasTexto
                            ? `≈ ${diasTexto} días`
                            : "sin estimación"}
                        </>
                      )}
                      {pedidosSemana > 0 && (
                        <> · pedidos semana: {pedidosSemana} u</>
                      )}
                      {faltaPedidos > 0 && (
                        <>
                          {" "}
                          · faltan {faltaPedidos} u para cubrir pedidos
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            </>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Todos los productos</span>
        </div>
        {recetasOrdenadasPorStock.map((r) => {
          const cant = (stock || {})[r.id] ?? 0;
          const bajo = cant <= 0;
          const metrica = metricasStock[r.id];
          const diasRestantes = metrica?.diasRestantes;
          const diasTexto =
            diasRestantes != null &&
            Number.isFinite(diasRestantes)
              ? formatearDiasStock(diasRestantes)
              : null;
          const sugeridoProducir =
            metrica && metrica.promedioDiario > 0
              ? Math.max(
                  0,
                  Math.ceil(
                    metrica.promedioDiario * DIAS_OBJETIVO_PRODUCCION -
                      cant,
                  ),
                )
              : null;
          const pedidosSemana = pedidosPendientesSemana[r.id] || 0;
          return (
            <div key={r.id} className="insumo-item">
              <span style={{ fontSize: 22 }}>{r.emoji}</span>
              <div className="insumo-info" style={{ flex: 1 }}>
                <div className="insumo-nombre">{r.nombre}</div>
                <div
                  className="insumo-detalle"
                  style={{
                    color: bajo
                      ? "var(--danger)"
                      : "var(--text-muted)",
                  }}
                >
                  {bajo ? "Sin stock" : `Stock: ${fmtStock(cant)}`}
                </div>
                {metrica && metrica.promedioDiario > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    Prom. últimos {METRICAS_VENTANA_DIAS} días:{" "}
                    {metrica.promedioDiario.toFixed(1)} u/día · stock ≈{" "}
                    {diasTexto || "—"} día
                    {diasTexto === "1" ? "" : "s"}
                    {sugeridoProducir > 0 && (
                      <> · sugerido producir: {sugeridoProducir}</>
                    )}
                  </div>
                )}
                {!metrica?.promedioDiario && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    Sin ventas en los últimos {METRICAS_VENTANA_DIAS} días
                  </div>
                )}
                {pedidosSemana > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    Pedidos semana: {pedidosSemana} u
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  type="button"
                  className="card-link"
                  onClick={() => onAjustarStock?.(r)}
                  title="Ajustar stock"
                >
                  Ajustar stock
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default StockList;
