import { buildCalendarCells, DIA_SEMANA, MESES } from "./datePickerUtils";

export default function DatePickerCalendar({
  view,
  selected,
  hoy,
  onPrev,
  onNext,
  onSelect,
}) {
  const cells = buildCalendarCells(view.year, view.month);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: "100%",
        marginTop: 6,
        zIndex: 50,
        background: "var(--surface)",
        borderRadius: 14,
        boxShadow: "var(--shadow-lg)",
        border: "1px solid var(--border)",
        padding: 14,
        minWidth: 280,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={onPrev}
          aria-label="Mes anterior"
          style={{
            background: "var(--cream)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            width: 36,
            height: 36,
            cursor: "pointer",
            fontSize: 18,
            color: "var(--purple-dark)",
          }}
        >
          ‹
        </button>
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            fontSize: 15,
            color: "var(--purple-dark)",
          }}
        >
          {MESES[view.month]} {view.year}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Mes siguiente"
          style={{
            background: "var(--cream)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            width: 36,
            height: 36,
            cursor: "pointer",
            fontSize: 18,
            color: "var(--purple-dark)",
          }}
        >
          ›
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          textAlign: "center",
        }}
      >
        {DIA_SEMANA.map((d) => (
          <span
            key={d}
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`e-${i}`} />;
          const d = new Date(view.year, view.month, day);
          d.setHours(0, 0, 0, 0);
          const isSelected =
            selected &&
            selected.getFullYear() === view.year &&
            selected.getMonth() === view.month &&
            selected.getDate() === day;
          const isHoy = d.getTime() === hoy.getTime();
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              style={{
                padding: "8px 0",
                border: "none",
                borderRadius: 8,
                background: isSelected
                  ? "var(--purple-dark)"
                  : isHoy
                    ? "var(--purple-light)"
                    : "transparent",
                color: isSelected ? "white" : "var(--text)",
                fontWeight: isSelected || isHoy ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
