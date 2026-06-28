export default function GastosCierreChecklist({ items, weekKey, checked, onToggle }) {
  if (!items.length) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">Checklist de cierre</span>
      </div>
      <div className="card-content">
        <p className="analytics-kpi-sub" style={{ marginBottom: 10 }}>
          Marcá lo que ya cargaste esta semana
        </p>
        {items.map((nombre) => {
          const key = `${weekKey}:${nombre}`;
          const done = !!checked[key];
          return (
            <label key={nombre} className="gasto-checklist-item">
              <input
                type="checkbox"
                checked={done}
                onChange={() => onToggle(key)}
              />
              <span className={done ? "gasto-checklist-done" : undefined}>
                {nombre}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
