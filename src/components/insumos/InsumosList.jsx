import { CATEGORIAS, CAT_COLORS } from "../../config/appConfig";
import { fmtStock } from "../../lib/format";

function InsumosList({
  search,
  setSearch,
  catActiva,
  setCatActiva,
  filtradosOrdenados,
  insumoStock,
  insumosMap,
  insumoMovimientos,
  precioPorU,
  onDetalle,
  onAbrirCompra,
  onNuevoInsumo,
  fmt,
}) {
  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <span className="card-title">Compras de stock</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
          Registrá en un solo paso lo que compraste y cuánto pagaste. Ideal cuando volvés del súper.
        </p>
        <button type="button" className="btn-primary" onClick={onAbrirCompra}>
          📥 Registrar compra de stock
        </button>
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          placeholder="Buscar insumo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="cat-tabs">
        {(() => {
          const usadas = Array.from(
            new Set((filtradosOrdenados || []).map((i) => i.categoria).filter(Boolean)),
          );
          const extras = usadas.filter((c) => !CATEGORIAS.includes(c));
          const todas = ["Todos", ...CATEGORIAS, ...extras];
          return todas.map((c) => (
            <button
              key={c}
              className={`cat-tab ${catActiva === c ? "active" : ""}`}
              onClick={() => setCatActiva(c)}
            >
              {c}
            </button>
          ));
        })()}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Stock y precios</span>
        </div>
        {filtradosOrdenados.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📦</div>
            <p>Sin resultados</p>
          </div>
        ) : (
          filtradosOrdenados.map((i) => {
            const stock = (insumoStock || {})[i.id] ?? 0;
            const unidad = i.unidad || "g";
            const stockNegativo = Number(stock) < 0;
            return (
              <div
                key={i.id}
                className="insumo-item"
                onClick={() => onDetalle(i)}
                style={{ cursor: "pointer" }}
              >
                <div
                  className="insumo-dot"
                  style={{ background: CAT_COLORS[i.categoria] || "#ccc" }}
                />
                <div className="insumo-info" style={{ flex: 1 }}>
                  <div className="insumo-nombre">{i.nombre}</div>
                  <div className="insumo-detalle">
                    {i.presentacion} · <span className="chip">{precioPorU(i)}</span> · Stock:{" "}
                    <span
                      style={{
                        color: stockNegativo ? "var(--danger)" : undefined,
                        fontWeight: stockNegativo ? 600 : undefined,
                      }}
                    >
                      {fmtStock(stock)} {unidad}
                    </span>
                    {" · "}
                    <span style={{ textDecoration: "underline" }}>Tocar para ver</span>
                  </div>
                </div>
                <div className="insumo-precio" style={{ marginLeft: 8 }}>
                  <div className="insumo-precio-value">{fmt(i.precio)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {insumoMovimientos && insumoMovimientos.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Últimos movimientos</span>
          </div>
          {insumoMovimientos.slice(0, 20).map((m) => {
            const ins = insumosMap[m.insumo_id];
            const esEgreso = m.tipo === "egreso";
            return (
              <div
                key={m.id}
                className="insumo-item"
                style={{
                  borderLeft: esEgreso ? "4px solid var(--danger)" : "4px solid var(--green)",
                  paddingLeft: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    className="insumo-nombre"
                    style={{ color: esEgreso ? "var(--danger)" : "inherit" }}
                  >
                    {esEgreso ? "−" : "+"}
                    {m.cantidad} {ins?.nombre || "?"} {esEgreso ? "(egreso)" : "(ingreso)"}
                  </div>
                  <div className="insumo-detalle">
                    {new Date(m.created_at).toLocaleString("es-AR")}
                    {m.valor != null && m.valor > 0 && ` · ${fmt(m.valor)}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="fab" onClick={onNuevoInsumo}>
        +
      </button>
    </>
  );
}

export default InsumosList;
