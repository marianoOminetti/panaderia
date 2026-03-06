/**
 * Barra de navegación inferior: pestañas (NAV_TABS). Muestra badge de stock en cero si aplica.
 * Usado por App.js. isMoreSection indica si el tab actual es uno del menú "Más".
 */
import { NAV_TABS } from "../../config/nav";

export default function AppNav({ tab, setTab, isMoreSection, sinStockCount }) {
  return (
    <nav className="nav">
      {NAV_TABS.map((t) => {
        const isActive = t.id === "more" ? isMoreSection : tab === t.id;
        return (
          <button
            key={t.id}
            className={`nav-btn ${isActive ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">
              {t.label}
              {t.id === "stock" && sinStockCount > 0 && (
                <span className="nav-badge-stock">{sinStockCount}</span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
