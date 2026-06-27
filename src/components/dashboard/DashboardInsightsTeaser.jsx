/**
 * Teaser en Inicio: resume insights y abre la pestaña Insights.
 */
function DashboardInsightsTeaser({ insights, onOpenInsights }) {
  const { all = [], top = [], hasUrgent } = insights || {};
  if (!all.length) return null;

  const urgentCount = all.filter((i) => i.severity === "urgent").length;
  const preview = top[0];

  return (
    <button
      type="button"
      className={`card dashboard-insights-teaser${hasUrgent ? " dashboard-insights-teaser--urgent" : ""}`}
      onClick={() => onOpenInsights?.()}
      style={{ marginBottom: 12, width: "100%", textAlign: "left" }}
    >
      <div className="card-header">
        <span className="card-title">💡 Insights</span>
        <span className="dashboard-insights-teaser-link">Ver todos →</span>
      </div>
      <p className="dashboard-insights-sub">
        {all.length} {all.length === 1 ? "cosa" : "cosas"} que podrías no estar viendo
        {urgentCount > 0 ? ` · ${urgentCount} urgente${urgentCount > 1 ? "s" : ""}` : ""}
      </p>
      {preview && (
        <p className="dashboard-insights-teaser-preview">
          {preview.severity === "urgent" ? "🔴" : preview.severity === "attention" ? "🟡" : "🟢"}{" "}
          {preview.title}
        </p>
      )}
    </button>
  );
}

export default DashboardInsightsTeaser;
