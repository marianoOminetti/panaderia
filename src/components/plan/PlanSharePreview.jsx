import { forwardRef } from "react";
import { fmt } from "../../lib/format";

const s = {
  root: {
    width: 360,
    backgroundColor: "#ffffff",
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: 20,
    borderRadius: 12,
    color: "#1a1a1a",
  },
  header: {
    textAlign: "center",
    paddingBottom: 14,
    borderBottom: "2px dashed #e8e8e8",
    marginBottom: 14,
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: "#5b3a8c",
    margin: "6px 0 0",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textTransform: "capitalize",
  },
  dayBlock: {
    marginBottom: 14,
  },
  dayHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
    paddingBottom: 6,
    borderBottom: "1px solid #eee",
    marginBottom: 8,
  },
  dayName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#5b3a8c",
  },
  dayDate: {
    fontSize: 11,
    color: "#888",
    textTransform: "capitalize",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    fontSize: 13,
  },
  emoji: { fontSize: 18, flexShrink: 0 },
  itemBody: { flex: 1, minWidth: 0 },
  itemName: { fontWeight: 500, lineHeight: 1.3 },
  itemSub: { fontSize: 10, color: "#888", marginTop: 1 },
  itemQty: {
    fontWeight: 600,
    fontSize: 12,
    color: "#333",
    textAlign: "right",
    maxWidth: "45%",
    lineHeight: 1.35,
  },
  empty: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
    margin: 0,
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px dashed #e8e8e8",
    fontSize: 10,
    color: "#aaa",
    textAlign: "center",
  },
};

function PlanShareItemRow({ item }) {
  const qtyLabel = Number.isInteger(item.qty) ? item.qty : item.qty.toFixed(1);
  return (
    <div style={s.item}>
      <span style={s.emoji}>{item.emoji}</span>
      <div style={s.itemBody}>
        <div style={s.itemName}>{item.nombre}</div>
        <div style={s.itemSub}>{item.tipo}</div>
      </div>
      <span style={s.itemQty}>
        {qtyLabel} {item.unidad}
      </span>
    </div>
  );
}

function PlanShareDaySection({ day }) {
  return (
    <div style={s.dayBlock}>
      <div style={s.dayHead}>
        <span style={s.dayName}>{day.dia}</span>
        <span style={s.dayDate}>{day.fecha}</span>
      </div>
      {day.items.map((item) => (
        <PlanShareItemRow key={`${day.diaIdx}-${item.nombre}`} item={item} />
      ))}
    </div>
  );
}

function PlanShareCompraSection({ group }) {
  return (
    <div style={s.dayBlock}>
      <div style={s.dayHead}>
        <span style={s.dayName}>{group.proveedor}</span>
      </div>
      {group.items.map((item) => (
        <div key={`${group.proveedor}-${item.nombre}`} style={s.item}>
          <div style={s.itemBody}>
            <div style={s.itemName}>{item.nombre}</div>
            <div style={s.itemSub}>Faltante según plan</div>
          </div>
          <span style={s.itemQty}>
            {item.faltante.toFixed(2)} {item.unidad}
            {item.costo > 0 ? ` · ${fmt(item.costo)}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

const PlanSharePreview = forwardRef(function PlanSharePreview(
  { mode, semanaTitulo, dayInfo, days, items, compraGroups, totalCompra },
  ref,
) {
  const generado = new Date().toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const titleByMode = {
    week: "Plan semanal de producción",
    day: "Plan del día",
    compra: "Lista de compras",
  };

  return (
    <div ref={ref} style={s.root}>
      <div style={s.header}>
        <h1 style={s.brand}>🌾 Gluten Free</h1>
        <p style={s.title}>{titleByMode[mode] || titleByMode.week}</p>
        {mode === "day" ? (
          <>
            <p style={{ ...s.subtitle, fontWeight: 600, color: "#5b3a8c", fontSize: 13 }}>
              {dayInfo?.dia}
            </p>
            <p style={s.subtitle}>{dayInfo?.fecha}</p>
          </>
        ) : (
          <p style={s.subtitle}>{semanaTitulo}</p>
        )}
      </div>

      {mode === "compra" ? (
        compraGroups?.length ? (
          <>
            {compraGroups.map((group) => (
              <PlanShareCompraSection key={group.proveedor} group={group} />
            ))}
            {totalCompra > 0 && (
              <p style={{ ...s.itemName, textAlign: "right", marginTop: 8 }}>
                Total estimado: {fmt(totalCompra)}
              </p>
            )}
          </>
        ) : (
          <p style={s.empty}>No hay faltantes para esta semana.</p>
        )
      ) : mode === "week" ? (
        days?.length ? (
          days.map((day) => <PlanShareDaySection key={day.diaIdx} day={day} />)
        ) : (
          <p style={s.empty}>Sin ítems planificados esta semana.</p>
        )
      ) : items?.length ? (
        items.map((item) => (
          <PlanShareItemRow key={item.nombre} item={item} />
        ))
      ) : (
        <p style={s.empty}>Nada planificado para este día.</p>
      )}

      <div style={s.footer}>Generado {generado}</div>
    </div>
  );
});

export default PlanSharePreview;
