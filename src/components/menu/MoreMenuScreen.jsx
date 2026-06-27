/**
 * Pantalla "Más": grilla de ítems (analytics, plan, clientes, insumos, recetas) que navegan por setTab.
 */
import PushNotificationsPanel from "./PushNotificationsPanel";

export default function MoreMenuScreen({ items, onNavigate, userId = null, sinStockCount = 0 }) {

  return (
    <div className="content">
      <p className="page-title">Más</p>
      <p className="page-subtitle">Acceso rápido al resto de la app</p>
      <div className="dashboard-quick-grid">
        {items.map(({ id, icon, label, sub }) => (
          <button
            key={id}
            type="button"
            className="dashboard-quick"
            onClick={() => onNavigate?.(id)}
          >
            <span className="dashboard-quick-icon">{icon}</span>
            <div className="dashboard-quick-text">
              <span className="dashboard-quick-label">{label}</span>
              <span className="dashboard-quick-sub">{sub}</span>
            </div>
            {id === "stock" && sinStockCount > 0 && (
              <span className="dashboard-quick-badge">{sinStockCount} en 0</span>
            )}
          </button>
        ))}
      </div>
      <PushNotificationsPanel userId={userId} />
    </div>
  );
}
