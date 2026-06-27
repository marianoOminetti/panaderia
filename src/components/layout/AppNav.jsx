/**
 * Barra de navegación inferior: pestañas (NAV_TABS). Badge de stock en cero en "Más".
 * Usado por App.js. isMoreSection indica si el tab actual es uno del menú "Más".
 */
import { NAV_TABS } from "../../config/nav";

export default function AppNav({
  visible = true,
  tab,
  setTab,
  isMoreSection,
  sinStockCount,
  insightsUrgentCount = 0,
  navTabs = NAV_TABS,
}) {
  return (
    <nav className={`nav ${visible ? "" : "nav--hidden"}`} aria-hidden={!visible} aria-label="Navegación principal">
      {navTabs.map((t) => {
        const isActive = t.id === "more" ? isMoreSection : tab === t.id;
        return (
          <button
            key={t.id}
            className={`nav-btn ${isActive ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">
              <span className="nav-label-copy">{t.label}</span>
              {t.id === "more" && sinStockCount > 0 && (
                <span className="nav-badge-stock">{sinStockCount}</span>
              )}
              {t.id === "insights" && insightsUrgentCount > 0 && tab !== "insights" && (
                <span className="nav-badge-stock">{insightsUrgentCount}</span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
