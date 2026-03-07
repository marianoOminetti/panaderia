function QuickAction({
  icon,
  label,
  sub,
  tab,
  onNavigate,
  onClick,
}) {
  return (
    <button
      className="dashboard-quick"
      onClick={() => {
        if (onClick) {
          onClick();
        } else {
          onNavigate?.(tab);
        }
      }}
    >
      <span className="dashboard-quick-icon">{icon}</span>
      <div className="dashboard-quick-text">
        <span className="dashboard-quick-label">{label}</span>
        <span className="dashboard-quick-sub">{sub}</span>
      </div>
    </button>
  );
}

function DashboardQuickGrid({
  insumosCount,
  onNavigate,
  onOpenNuevaVenta,
  onOpenNuevoPedido,
}) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Accesos rápidos</span>
      </div>
      <div className="dashboard-quick-grid">
        <QuickAction
          icon="💰"
          label="Venta"
          sub="Registrar venta"
          tab="ventas"
          onNavigate={onNavigate}
          onClick={onOpenNuevaVenta}
        />
        <QuickAction
          icon="📋"
          label="Pedido"
          sub="Pedido futuro"
          onClick={onOpenNuevoPedido}
        />
        <QuickAction
          icon="💸"
          label="Gasto"
          sub="Agregar gasto"
          tab="gastos"
          onNavigate={onNavigate}
        />
        <QuickAction
          icon="📦"
          label="Insumos"
          sub={`${insumosCount} productos`}
          tab="insumos"
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

export default DashboardQuickGrid;

