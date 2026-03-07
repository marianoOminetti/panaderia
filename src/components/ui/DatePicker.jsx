import { useState, useRef, useEffect, useId } from "react";

const MESES =
  "Enero Febrero Marzo Abril Mayo Junio Julio Agosto Septiembre Octubre Noviembre Diciembre".split(
    " "
  );
const DIA_SEMANA = "Do Lu Ma Mi Ju Vi Sa".split(" ");

function toISO(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function parseISO(iso) {
  if (!iso || iso.length < 10) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(iso) {
  const d = parseISO(iso);
  if (!d) return "";
  const day = d.getDate();
  const month = MESES[d.getMonth()].slice(0, 3);
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * DatePicker custom de la app (calendario, no input nativo).
 * value: string ISO (YYYY-MM-DD)
 * onChange: (isoDate: string) => void
 */
export default function DatePicker({
  value,
  onChange,
  label = "Fecha",
  className = "",
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = parseISO(value) || new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const boxRef = useRef(null);

  const iso = value && value.slice(0, 10);
  const selected = parseISO(iso);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (!open) return;
    const d = parseISO(value) || new Date();
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, [open]);

  const first = new Date(view.year, view.month, 1);
  const last = new Date(view.year, view.month + 1, 0);
  const startPad = first.getDay();
  const days = last.getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const handlePrev = () => {
    if (view.month === 0) setView({ year: view.year - 1, month: 11 });
    else setView({ year: view.year, month: view.month - 1 });
  };
  const handleNext = () => {
    if (view.month === 11) setView({ year: view.year + 1, month: 0 });
    else setView({ year: view.year, month: view.month + 1 });
  };
  const handleSelect = (day) => {
    if (day == null) return;
    const next = toISO(view.year, view.month, day);
    onChange(next);
    setOpen(false);
  };

  return (
    <div
      className={`form-group ${className}`.trim()}
      ref={boxRef}
      style={{ position: "relative" }}
    >
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="form-input"
        style={{
          width: "100%",
          maxWidth: 200,
          textAlign: "left",
          cursor: "pointer",
          appearance: "none",
        }}
      >
        {iso ? formatDisplay(iso) : "Elegir fecha"}
      </button>
      {open && (
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
              onClick={handlePrev}
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
              onClick={handleNext}
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
              if (day === null)
                return <span key={`e-${i}`} />;
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
                  onClick={() => handleSelect(day)}
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
      )}
    </div>
  );
}
