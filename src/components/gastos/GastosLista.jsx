import { fmt } from "../../lib/format";
import GastosFijoRow from "./GastosFijoRow";
import { FILTROS_TIPO, GRUPOS_TIPO } from "./gastosFijosConstants";
import { getTipo } from "./gastosFijosHelpers";

export default function GastosLista({
  search,
  onSearchChange,
  tipoFiltro,
  onTipoFiltroChange,
  soloSemanaActual,
  onAplicarFacturasSemana,
  ordenMonto,
  onToggleOrdenMonto,
  gastosVigentes,
  vigentesFiltrados,
  gastosHistoricos,
  showHistoricos,
  onToggleHistoricos,
  subtotalGrupo,
  onEdit,
}) {
  const renderGrupo = (grupoKey, items) => {
    if (!items.length) return null;
    const label = GRUPOS_TIPO.find((g) => g.key === grupoKey)?.label || grupoKey;
    const sub = subtotalGrupo(grupoKey);
    return (
      <div key={grupoKey} className="gasto-grupo">
        <div className="gasto-grupo-header">
          <span className="insights-section-title">{label}</span>
          <span className="gasto-grupo-subtotal">
            {fmt(sub)} esta semana
          </span>
        </div>
        {items.map((g) => (
          <GastosFijoRow key={g.id} g={g} onEdit={onEdit} />
        ))}
      </div>
    );
  };

  const renderListaVigentes = () => {
    if (gastosVigentes.length === 0) {
      return (
        <div className="empty">
          <div className="empty-icon">💸</div>
          <p>No configuraste gastos todavía.</p>
          <p className="analytics-kpi-sub">Tocá Nuevo gasto para empezar.</p>
        </div>
      );
    }
    if (vigentesFiltrados.length === 0) {
      return (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <p>Sin resultados</p>
        </div>
      );
    }
    if (tipoFiltro === "Todos" && !ordenMonto) {
      return GRUPOS_TIPO.map(({ key }) =>
        renderGrupo(
          key,
          vigentesFiltrados.filter((g) => getTipo(g) === key)
        )
      );
    }
    return vigentesFiltrados.map((g) => (
      <GastosFijoRow key={g.id} g={g} onEdit={onEdit} />
    ));
  };

  return (
    <>
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          placeholder="Buscar gasto..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="cat-tabs">
        {FILTROS_TIPO.map((f) => (
          <button
            key={f}
            type="button"
            className={`cat-tab ${tipoFiltro === f ? "active" : ""}`}
            onClick={() => onTipoFiltroChange(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="gasto-toolbar">
        <button
          type="button"
          className={`cat-tab ${soloSemanaActual ? "active" : ""}`}
          onClick={onAplicarFacturasSemana}
        >
          Facturas de la semana
        </button>
        <button
          type="button"
          className={`cat-tab ${ordenMonto ? "active" : ""}`}
          onClick={onToggleOrdenMonto}
        >
          {ordenMonto ? "Orden: monto ↓" : "Orden: tipo"}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Lista de gastos</span>
          {vigentesFiltrados.length > 0 && (
            <span className="analytics-kpi-sub">{vigentesFiltrados.length}</span>
          )}
        </div>
        {renderListaVigentes()}

        {gastosHistoricos.length > 0 && (
          <div className="gasto-historicos">
            <button
              type="button"
              className="analytics-drill-accordion-btn"
              onClick={onToggleHistoricos}
              aria-expanded={showHistoricos}
            >
              <span style={{ flex: 1, textAlign: "left", fontWeight: 600 }}>
                Gastos pasados ({gastosHistoricos.length})
              </span>
              <span
                className="analytics-drill-accordion-chevron"
                aria-hidden
              >
                {showHistoricos ? "▾" : "▸"}
              </span>
            </button>
            {showHistoricos &&
              gastosHistoricos.map((g) => (
                <GastosFijoRow
                  key={g.id}
                  g={g}
                  historico
                  onEdit={onEdit}
                />
              ))}
          </div>
        )}
      </div>
    </>
  );
}
