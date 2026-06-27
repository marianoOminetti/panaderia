/**
 * Pantalla Insights: radar de puntos ciegos del negocio (pestaña propia).
 */
import { memo } from "react";
import InsightsList from "./InsightsList";

function Insights({ insights, onNavigate, onStockQuickEdit }) {
  const { all = [] } = insights || {};

  const handleAction = (item) => {
    if (item.navigateTo) onNavigate?.(item.navigateTo);
  };

  return (
    <div className="content">
      <p className="page-title">Insights</p>
      <p className="page-subtitle">
        Lo que podrías no estar viendo · {all.length}{" "}
        {all.length === 1 ? "detectado" : "detectados"}
      </p>

      <div className="insights-panel">
        <InsightsList
          items={all}
          onAction={handleAction}
          onStockQuickEdit={onStockQuickEdit}
          showSummary
        />
      </div>
    </div>
  );
}

export default memo(Insights);
