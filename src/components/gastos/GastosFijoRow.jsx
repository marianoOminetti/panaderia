import { fmt } from "../../lib/format";
import { TIPO_COLORS } from "./gastosFijosConstants";
import { getTipo, vencePronto } from "./gastosFijosHelpers";
import { renderDetalleFila } from "./gastosFijosRowHelpers";

export default function GastosFijoRow({ g, historico = false, onEdit }) {
  const tipo = getTipo(g);
  const pronto = vencePronto(g);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit(g);
    }
  };

  return (
    <div
      className={`insumo-item gasto-item${historico ? " gasto-item--historico" : ""}`}
      onClick={() => onEdit(g)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div
        className="insumo-dot"
        style={{ background: TIPO_COLORS[tipo] || "#ccc" }}
      />
      <div className="insumo-info" style={{ flex: 1, minWidth: 0 }}>
        <div className="insumo-nombre">
          {g.nombre}
          {pronto && (
            <span className="gasto-badge-vence">Vence pronto</span>
          )}
        </div>
        <div className="insumo-detalle">{renderDetalleFila(g)}</div>
      </div>
      <div className="insumo-precio" style={{ marginLeft: 8 }}>
        <div className="insumo-precio-value">{fmt(g.monto)}</div>
      </div>
    </div>
  );
}
