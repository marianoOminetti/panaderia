import { useState, useMemo } from "react";
import { CATEGORIAS, CAT_COLORS } from "../../config/appConfig";
import { fmtPrecio } from "../../lib/format";

function InsumosCompra({
  compraCart,
  compraSaving,
  compraListening,
  compraTranscript,
  insumos,
  insumoStock,
  totalCompra,
  precioPorU,
  onBack,
  onHablar,
  onDetener,
  agregarAlCarrito,
  actualizarCantidadCarrito,
  actualizarPrecioCarrito,
  eliminarDeCarrito,
  confirmarCompra,
  showToast,
}) {
  const [compraSearch, setCompraSearch] = useState("");
  const [compraCatActiva, setCompraCatActiva] = useState("Todos");

  const filtradosOrdenados = useMemo(() => {
    let list = insumos || [];
    if (compraCatActiva !== "Todos") {
      list = list.filter((i) => i.categoria === compraCatActiva);
    }
    const q = (compraSearch || "").trim().toLowerCase();
    if (q) {
      list = list.filter((i) =>
        (i.nombre || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const sa = (insumoStock || {})[a.id] ?? 0;
      const sb = (insumoStock || {})[b.id] ?? 0;
      if (sa !== sb) return sa - sb;
      return (a.nombre || "").localeCompare(b.nombre || "", "es", {
        sensitivity: "base",
      });
    });
  }, [insumos, insumoStock, compraSearch, compraCatActiva]);

  return (
    <div className="screen-overlay">
      <div
        className="screen-header"
        style={{ alignItems: "flex-start" }}
      >
        <button
          className="screen-back"
          onClick={onBack}
          disabled={compraSaving}
        >
          ← Volver
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <div className="screen-title">Cargar compra</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Registrar compra de stock
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Total
          </div>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 20,
              color: "var(--purple-dark)",
            }}
          >
            {fmtPrecio(totalCompra)}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={compraListening ? onDetener : onHablar}
              disabled={compraSaving}
            >
              🎙️ Voz
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={confirmarCompra}
              disabled={compraSaving || compraCart.length === 0}
            >
              {compraSaving ? "Guardando…" : "✓ Confirmar"}
            </button>
          </div>
        </div>
      </div>
      <div className="screen-content">
        {compraTranscript && (
          <p
            className="voice-transcript"
            style={{ marginBottom: 8, fontSize: 12 }}
          >
            &quot;{compraTranscript}&quot;
          </p>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Carrito de compra</span>
          </div>
          {compraCart.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                padding: "8px 0 4px",
              }}
            >
              Tocá un insumo de la lista para agregarlo al carrito.
            </p>
          ) : (
            <>
              {compraCart.map((item) => {
                const ins = item.insumo;
                const unidad = ins.unidad || "g";
                const cantPorPres = Number(ins.cantidad_presentacion) || 1;
                const cantidadTotal = (item.presentaciones || 0) * cantPorPres;
                const precio =
                  typeof item.precioPresentacion === "number"
                    ? item.precioPresentacion
                    : Number(item.precioPresentacion) || 0;
                const subtotal = precio * (item.presentaciones || 0);
                const rawPrecio =
                  typeof item.precioPresentacion === "number"
                    ? item.precioPresentacion
                    : Number(item.precioPresentacion) || 0;
                const displayPrecio =
                  item.precioPresentacion === ""
                    ? ""
                    : rawPrecio >= 100
                      ? String(Math.round(rawPrecio))
                      : String(rawPrecio);
                return (
                  <div
                    key={ins.id}
                    className="insumo-item"
                    style={{
                      alignItems: "center",
                      padding: "8px 0",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      className="insumo-info"
                      style={{
                        flex: "1 1 auto",
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>🌿</span>
                        <span className="insumo-nombre">{ins.nombre}</span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              actualizarCantidadCarrito(ins.id, -1)
                            }
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              border: "1px solid var(--border)",
                              background: "var(--cream)",
                              cursor: "pointer",
                              fontSize: 16,
                            }}
                            disabled={compraSaving}
                          >
                            −
                          </button>
                          <span
                            style={{
                              minWidth: 20,
                              textAlign: "center",
                              fontSize: 14,
                            }}
                          >
                            {item.presentaciones || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              actualizarCantidadCarrito(ins.id, 1)
                            }
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              border: "1px solid var(--border)",
                              background: "var(--cream)",
                              cursor: "pointer",
                              fontSize: 16,
                            }}
                            disabled={compraSaving}
                          >
                            +
                          </button>
                        </div>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={displayPrecio}
                          onChange={(e) =>
                            actualizarPrecioCarrito(ins.id, e.target.value)
                          }
                          style={{
                            width: 90,
                            padding: "6px 8px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            fontSize: 13,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => eliminarDeCarrito(ins.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--danger)",
                            fontSize: 18,
                            cursor: "pointer",
                          }}
                          disabled={compraSaving}
                        >
                          ×
                        </button>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginLeft: 26,
                        }}
                      >
                        {cantidadTotal} {unidad} · Subtotal{" "}
                        {fmtPrecio(subtotal)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                  borderTop: "1px dashed var(--border)",
                  paddingTop: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  Total de la compra
                </span>
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  {fmtPrecio(totalCompra)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Insumos</span>
          </div>
          <div className="search-bar" style={{ marginBottom: 8 }}>
            <span className="search-icon">🔍</span>
            <input
              placeholder="Buscar insumo..."
              value={compraSearch}
              onChange={(e) => setCompraSearch(e.target.value)}
            />
          </div>
          <div className="cat-tabs" style={{ marginBottom: 12 }}>
            {["Todos", ...CATEGORIAS].map((c) => (
              <button
                key={c}
                type="button"
                className={`cat-tab ${compraCatActiva === c ? "active" : ""}`}
                onClick={() => setCompraCatActiva(c)}
              >
                {c}
              </button>
            ))}
          </div>
          {filtradosOrdenados.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📦</div>
              <p>Sin resultados</p>
            </div>
          ) : (
            filtradosOrdenados.map((i) => {
              const stockActual = (insumoStock || {})[i.id] ?? 0;
              const unidad = i.unidad || "g";
              return (
                <div
                  key={i.id}
                  className="insumo-item"
                  onClick={() => {
                    agregarAlCarrito(i);
                    showToast(`➕ ${i.nombre} agregado al carrito`);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    className="insumo-dot"
                    style={{
                      background: CAT_COLORS[i.categoria] || "#ccc",
                    }}
                  />
                  <div className="insumo-info" style={{ flex: 1 }}>
                    <div className="insumo-nombre">{i.nombre}</div>
                    <div className="insumo-detalle">
                      {i.presentacion} ·{" "}
                      <span className="chip">{precioPorU(i)}</span> · Stock:{" "}
                      {stockActual} {unidad}
                    </div>
                  </div>
                  <div className="insumo-precio" style={{ marginLeft: 8 }}>
                    <div className="insumo-precio-value">
                      {fmtPrecio(i.precio)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default InsumosCompra;
