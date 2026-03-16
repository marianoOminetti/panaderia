import { useId } from "react";

/**
 * Input de texto/número con label, estilo unificado de la app.
 * type: "text" | "number" | "email" | "tel" | "password"
 */
export default function FormInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  disabled = false,
  required = false,
  min,
  max,
  step,
  className = "",
  inputClassName = "",
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
      <input
        id={id}
        name={name}
        type={type}
        className={`form-input ${inputClassName}`.trim()}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        step={step}
        autoFocus={autoFocus}
      />
    </div>
  );
}
