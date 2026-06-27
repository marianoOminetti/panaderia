import { DIAS_CORTO, sumPorDia } from "../../lib/planSugerencias";

export default function PlanSemanalDiaGrid({ porDia, onChange, disabled, metaTotal }) {
  const suma = sumPorDia(porDia);
  const ok = metaTotal == null || suma === metaTotal;

  return (
    <div className="plan-dia-wrap">
      <div className="plan-dia-grid">
        {DIAS_CORTO.map((label, idx) => (
          <div key={label} className="plan-dia-col">
            <span className="plan-dia-label">{label}</span>
            <input
              type="number"
              min={0}
              step={1}
              className="plan-dia-input"
              value={porDia[idx] || 0}
              onChange={(e) => onChange(idx, Math.max(0, parseInt(e.target.value, 10) || 0))}
              disabled={disabled}
              aria-label={`${label} cantidad`}
            />
          </div>
        ))}
      </div>
      <span className={`plan-dia-total ${ok ? "" : "plan-dia-total--warn"}`}>
        Σ {suma}
        {metaTotal != null && ` / ${metaTotal}`}
      </span>
    </div>
  );
}
