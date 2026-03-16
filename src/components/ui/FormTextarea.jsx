import { useId } from "react";

/**
 * Textarea con label, estilo unificado de la app.
 */
export default function FormTextarea({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  disabled = false,
  required = false,
  rows = 3,
  className = "",
  style,
  autoFocus = false,
}) {
  const id = useId();

  return (
    <div className={`form-group ${className}`.trim()} style={style}>
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
          {required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
        </label>
      )}
      <textarea
        id={id}
        name={name}
        className="form-input form-textarea"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        autoFocus={autoFocus}
      />
    </div>
  );
}
