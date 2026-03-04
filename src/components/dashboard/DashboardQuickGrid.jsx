function QuickAction({ icon, label, sub, tab, alert, onNavigate }) {
  return (
    <button
      className="dashboard-quick"
      onClick={() => onNavigate?.(tab)}
    >
      <span className="dashboard-quick-icon">{icon}</span>
      <div className="dashboard-quick-text">
        <span className="dashboard-quick-label">{label}</span>
        <span className="dashboard-quick-sub">{sub}</span>
      </div>
      {alert && (
        <span className="dashboard-quick-badge">{alert}</span>
      )}
    </button>
  );
}

function DashboardQuickGrid({
  stockBajo,
  recetasMargenBajo,
  clientesCount,
  insumosCount,
  recetasCount,
  onNavigate,
}) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Accesos rápidos</span>
      </div>
      <div className="dashboard-quick-grid">
        <QuickAction
          icon="💰"
          label="Registrar venta"
          sub="Manual o por voz"
          tab="ventas"
          onNavigate={onNavigate}
        />
        <QuickAction
          icon="📥"
          label="Cargar stock"
          sub={
            stockBajo.length > 0
              ? `${stockBajo.length} sin stock`
              : "Por voz o manual"
          }
          tab="stock"
          alert={stockBajo.length > 0 ? stockBajo.length : null}
          onNavigate={onNavigate}
        />
        <QuickAction
          icon="📆"
          label="Plan y pedidos"
          sub="Semana y pedidos futuros"
          tab="plan"
          onNavigate={onNavigate}
        />
        <QuickAction
          icon="👥"
          label="Clientes"
          sub={`${clientesCount} registrados`}
          tab="clientes"
          onNavigate={onNavigate}
        />
        <QuickAction
          icon="📦"
          label="Insumos"
          sub={`${insumosCount} productos`}
          tab="insumos"
          onNavigate={onNavigate}
        />
        <QuickAction
          icon="📋"
          label="Recetas"
          sub={`${recetasCount} recetas`}
          tab="recetas"
          alert={
            recetasMargenBajo.length > 0
              ? recetasMargenBajo.length
              : null
          }
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

export default DashboardQuickGrid;

