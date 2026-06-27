/**
 * Lista de insights agrupables por severidad. Usada en pantalla Insights y teaser de Inicio.
 */
const SEVERITY_META = {
  urgent: { icon: "🔴", label: "Urgente", accent: "urgent" },
  attention: { icon: "🟡", label: "Atención", accent: "attention" },
  opportunity: { icon: "🟢", label: "Oportunidad", accent: "opportunity" },
};

export function groupInsightsBySeverity(items = []) {
  return {
    urgent: items.filter((i) => i.severity === "urgent"),
    attention: items.filter((i) => i.severity === "attention"),
    opportunity: items.filter((i) => i.severity === "opportunity"),
  };
}

function InsightRow({ item, onAction, onStockQuickEdit, compact = false }) {
  const meta = SEVERITY_META[item.severity] || SEVERITY_META.attention;
  const hasAction =
    item.action &&
    (item.actionType === "stock_quick_edit"
      ? onStockQuickEdit
      : item.navigateTo && onAction);

  const handleAction = () => {
    if (item.actionType === "stock_quick_edit" && item.recetaId) {
      onStockQuickEdit?.(item.recetaId, {
        cantidad: item.suggestedQty,
        hint: item.body,
      });
      return;
    }
    if (item.navigateTo) onAction?.(item);
  };

  return (
    <div
      className={`insights-item insights-item--${meta.accent}${compact ? " insights-item--compact" : ""}`}
    >
      <div className="insights-item-top">
        <span className="insights-item-severity">
          {meta.icon} {meta.label}
        </span>
      </div>
      <div className="insights-item-title">{item.title}</div>
      <div className="insights-item-body">{item.body}</div>
      {hasAction && (
        <button
          type="button"
          className={`insights-item-action${item.actionType === "stock_quick_edit" ? " insights-item-action--primary" : ""}`}
          onClick={handleAction}
        >
          {item.action}
          {item.actionType === "stock_quick_edit" ? "" : " →"}
        </button>
      )}
    </div>
  );
}

function InsightsSection({ title, items, onAction, onStockQuickEdit, compact }) {
  if (!items?.length) return null;
  return (
    <section className="insights-section">
      {!compact && (
        <div className="insights-section-head">
          <h2 className="insights-section-title">{title}</h2>
          <span className="insights-section-count">{items.length}</span>
        </div>
      )}
      <div className="insights-list">
        {items.map((item) => (
          <InsightRow
            key={item.id}
            item={item}
            onAction={onAction}
            onStockQuickEdit={onStockQuickEdit}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
}

function InsightsSummary({ groups }) {
  const chips = [
    { key: "urgent", label: "Urgente", count: groups.urgent.length },
    { key: "attention", label: "Atención", count: groups.attention.length },
    { key: "opportunity", label: "Oportunidad", count: groups.opportunity.length },
  ].filter((c) => c.count > 0);

  if (!chips.length) return null;

  return (
    <div className="insights-summary">
      {chips.map((c) => (
        <span key={c.key} className={`insights-chip insights-chip--${c.key}`}>
          {c.count} {c.label.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

export default function InsightsList({
  items = [],
  onAction,
  onStockQuickEdit,
  compact = false,
  grouped = true,
  showSummary = false,
}) {
  if (!items.length) {
    return (
      <div className="empty">
        <div className="empty-icon">✨</div>
        <p>Sin insights por ahora.</p>
      </div>
    );
  }

  if (!grouped) {
    return (
      <div className="insights-list">
        {items.map((item) => (
          <InsightRow
            key={item.id}
            item={item}
            onAction={onAction}
            onStockQuickEdit={onStockQuickEdit}
            compact={compact}
          />
        ))}
      </div>
    );
  }

  const groups = groupInsightsBySeverity(items);

  return (
    <>
      {showSummary && !compact && <InsightsSummary groups={groups} />}
      <InsightsSection
        title="Urgente"
        items={groups.urgent}
        onAction={onAction}
        onStockQuickEdit={onStockQuickEdit}
        compact={compact}
      />
      <InsightsSection
        title="Atención"
        items={groups.attention}
        onAction={onAction}
        onStockQuickEdit={onStockQuickEdit}
        compact={compact}
      />
      <InsightsSection
        title="Oportunidades"
        items={groups.opportunity}
        onAction={onAction}
        onStockQuickEdit={onStockQuickEdit}
        compact={compact}
      />
    </>
  );
}
