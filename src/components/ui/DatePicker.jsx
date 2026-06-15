import { useState, useRef, useEffect, useId } from "react";
import DatePickerCalendar from "./DatePickerCalendar";
import { formatDisplay, parseISO, toISO } from "./datePickerUtils";

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
    onChange(toISO(view.year, view.month, day));
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
        <DatePickerCalendar
          view={view}
          selected={selected}
          hoy={hoy}
          onPrev={handlePrev}
          onNext={handleNext}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
